import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Stratégie Local pour l'authentification par email/password
 * Utilisée lors du login
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Utiliser email au lieu de username
      passwordField: 'password',
    });
  }

  /**
   * Méthode appelée pour valider les credentials
   * @param email - Email de l'utilisateur
   * @param password - Password en clair
   * @returns User si valide, sinon lance une exception
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
