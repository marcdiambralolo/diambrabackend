import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly accessCookieName = 'monetoile_access_token';
  private readonly refreshCookieName = 'monetoile_refresh_token';

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly redisService: RedisService,
  ) { }

  private getAccessTokenTtlSeconds() {
    return Number(this.configService.get<number>('JWT_EXPIRATION') || 604800);
  }

  private getRefreshTokenTtlSeconds() {
    return Number(this.configService.get<number>('JWT_REFRESH_EXPIRATION') || 2592000);
  }

  private getCookieSameSite(): 'lax' | 'strict' | 'none' {
    const configured = String(this.configService.get<string>('AUTH_COOKIE_SAMESITE') || '').toLowerCase();

    if (configured === 'strict' || configured === 'none') {
      return configured;
    }

    return this.configService.get<string>('NODE_ENV') === 'production' ? 'none' : 'lax';
  }

  private isSecureCookieEnabled() {
    const configured = this.configService.get<string>('AUTH_COOKIE_SECURE');

    if (configured === 'true') {
      return true;
    }

    if (configured === 'false') {
      return false;
    }

    return this.getCookieSameSite() === 'none' || this.configService.get<string>('NODE_ENV') === 'production';
  }

  private getCookieDomain() {
    const domain = this.configService.get<string>('AUTH_COOKIE_DOMAIN');
    return domain?.trim() || undefined;
  }

  private buildCookieOptions(maxAgeMs: number) {
    return {
      httpOnly: true,
      secure: this.isSecureCookieEnabled(),
      sameSite: this.getCookieSameSite(),
      path: '/',
      maxAge: maxAgeMs,
      domain: this.getCookieDomain(),
    } as const;
  }

  private sanitizeUser(user: UserDocument) {
    const userObject = user.toObject();
    const {
      password,
      emailVerificationToken,
      resetPasswordToken,
      currentRefreshTokenHash,
      currentRefreshTokenIssuedAt,
      ...userWithoutSecrets
    } = userObject;

    void password;
    void emailVerificationToken;
    void resetPasswordToken;
    void currentRefreshTokenHash;
    void currentRefreshTokenIssuedAt;

    return userWithoutSecrets;
  }

  // Stocke le refreshToken dans Redis (clé: session:user:{userId})
  private async persistRefreshToken(userId: string, refreshToken: string) {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds);
    const key = `session:user:${userId}`;
    // TTL = durée de vie du refresh token
    const ttl = this.getRefreshTokenTtlSeconds();
    await this.redisService.set(key, refreshTokenHash, ttl);
    // Pour compatibilité, on garde aussi en base (optionnel)
    await this.userModel.findByIdAndUpdate(userId, {
      currentRefreshTokenHash: refreshTokenHash,
      currentRefreshTokenIssuedAt: new Date(),
    }).exec();
  }

  private async revokeRefreshToken(userId: string) {
    const key = `session:user:${userId}`;
    await this.redisService.del(key);
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: {
        currentRefreshTokenHash: '',
        currentRefreshTokenIssuedAt: '',
      },
    }).exec();
  }

  private setSessionCookies(response: Response, accessToken: string, refreshToken: string) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(
      this.accessCookieName,
      accessToken,
      this.buildCookieOptions(this.getAccessTokenTtlSeconds() * 1000),
    );
    response.cookie(
      this.refreshCookieName,
      refreshToken,
      this.buildCookieOptions(this.getRefreshTokenTtlSeconds() * 1000),
    );
  }

  private clearSessionCookies(response: Response) {
    const expiredCookieOptions = this.buildCookieOptions(0);

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    response.clearCookie(this.accessCookieName, expiredCookieOptions);
    response.clearCookie(this.refreshCookieName, expiredCookieOptions);
  }

  private async issueSession(user: UserDocument, response?: Response) {
    const tokens = await this.generateTokens(user);
    await this.persistRefreshToken(user._id.toString(), tokens.refreshToken);

    if (response) {
      this.setSessionCookies(response, tokens.accessToken, tokens.refreshToken);
    }

    return {
      success: true,
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: this.getAccessTokenTtlSeconds(),
      refreshTokenExpiresIn: this.getRefreshTokenTtlSeconds(),
      authTransport: 'cookie',
    };
  }

  private async resolveUserIdFromToken(token: string | undefined, secret?: string) {
    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, secret ? { secret } : undefined);
      return payload.sub;
    } catch {
      return null;
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(registerDto: RegisterDto, response?: Response) {
    const { username, gender, country, phone, password, ...optionals } = registerDto;
    const email = `${username}@monetoile.org`;

    // Vérifier si le username ou l'email existe déjà
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur avec tous les champs reçus
    const user = new this.userModel({
      ...optionals,
      username,
      gender: gender,
      country: country || 'Cote d\'Ivoire',
      phone,
      email,
      password: hashedPassword,
      role: Role.USER, // Par défaut USER
      isActive: true,
    });

    await user.save();

    return this.issueSession(user, response);
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(loginDto: LoginDto, response?: Response) {
    const { username, password } = loginDto;

    // Valider les credentials
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Mettre à jour lastLogin
    await this.userModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return this.issueSession(user, response);
  }

  /**
   * Valider les credentials d'un utilisateur
   * Utilisé par LocalStrategy
   */
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ username }).exec();

    if (!user) {
      return null;
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Vérifier le password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Générer les tokens JWT (access + refresh)
   */
  async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role ?? Role.USER,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<number>('JWT_EXPIRATION') || 604800, // 7 days
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<number>('JWT_REFRESH_EXPIRATION') || 2592000, // 30 days
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rafraîchir le token d'accès avec un refresh token
   */
  async refreshToken(refreshToken: string | undefined, response?: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub).exec();

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validation du refreshToken via Redis
      const redisKey = `session:user:${user._id}`;
      const redisHash = await this.redisService.get(redisKey);
      if (!redisHash) {
        await this.revokeRefreshToken(user._id.toString());
        throw new UnauthorizedException('Refresh token has been revoked');
      }
      const refreshTokenMatches = await bcrypt.compare(refreshToken, redisHash);
      if (!refreshTokenMatches) {
        await this.revokeRefreshToken(user._id.toString());
        throw new UnauthorizedException('Refresh token has been rotated or revoked');
      }

      return this.issueSession(user, response);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -emailVerificationToken -resetPasswordToken -currentRefreshTokenHash -currentRefreshTokenIssuedAt')
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  /**
   * User logout
   */
  async logout(options?: { response?: Response; refreshToken?: string; accessToken?: string }) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const userIdFromRefreshToken = await this.resolveUserIdFromToken(options?.refreshToken, refreshSecret);
    const userIdFromAccessToken = await this.resolveUserIdFromToken(options?.accessToken);
    const userId = userIdFromRefreshToken || userIdFromAccessToken;

    if (userId) {
      await this.revokeRefreshToken(userId);
    }

    if (options?.response) {
      this.clearSessionCookies(options.response);
    }

    return {
      message: 'Logout successful',
      success: true,
      authTransport: 'cookie',
      clientCacheAction: 'PURGE_ALL_AUTH_SCOPED_CACHE',
    };
  }
}