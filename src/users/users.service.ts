/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) { }

  async getSubscribersCount(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  /**
   * (Optionnel) À appeler si tu modifies les GradeConfig souvent et tu veux invalider le cache.
   */
  invalidateGradeCache() {
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(userId: string, role: Role): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Créer un nouvel utilisateur (admin only)
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, gender, phone, specialties, ...rest } = createUserDto;

    // Générer l'email automatiquement
    const email = `${username}@diambra.net`;

    // Vérifier si le username ou l'email existe déjà
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Mapper le genre français vers anglais
    let mappedGender = gender;
    if (gender === 'Homme') mappedGender = 'male';
    else if (gender === 'Femme') mappedGender = 'female';

    // Hasher le password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const user = new this.userModel({
      ...rest,
      username,
      gender: mappedGender,
      phone,
      specialties,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Retourner sans le password
    const { password: _, ...userWithoutPassword } = user.toObject();

    return userWithoutPassword as any;
  }
 
  /**
   * Récupérer tous les utilisateurs avec pagination et filtres
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, isActive, search } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Récupérer les utilisateurs
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -emailVerificationToken -resetPasswordToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findOne(id: string): Promise<User & { photoUrl: string | null; posterUrl: string | null; idPhotoUrl: string | null }> {
    const user = await this.userModel
      .findById(id)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ajout d'alias explicites pour le frontend
    const userObj = user.toObject();
    const enriched = {
      ...userObj,
      photoUrl: userObj.photo || null,
      posterUrl: userObj.poster || null,
      idPhotoUrl: userObj.idPhoto || null,
    };
    return enriched as any;
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();
      if (existingUser && existingUser._id.toString() !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Changer le password d'un utilisateur
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Récupérer l'utilisateur avec le password
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier le password actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    // Hasher le nouveau password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le password
    await this.userModel.findByIdAndUpdate(userId, { password: hashedPassword }).exec();
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  async remove(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { isActive: false }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Supprimer définitivement un utilisateur (hard delete - super admin only)
   */
  async hardDelete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Obtenir les statistiques des utilisateurs
   */
  async getStatistics() {
    const [totalUsers, activeUsers, inactiveUsers, usersByRole] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments({ isActive: false }).exec(),
      this.userModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

}