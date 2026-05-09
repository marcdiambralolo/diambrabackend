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
import { GradeConfig } from '../grades/schemas/grade-config.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterMediumDto } from './dto/register-medium.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    const email = `${username}@monetoile.org`;

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
   * Recherche avancée de consultants par mot-clé sur plusieurs champs
   */
  async searchConsultants(q: string) {
    if (!q || q.trim().length < 2) {
      return { consultants: [] };
    }
    const keyword = q.trim();
    const filter: any = {
      role: Role.CONSULTANT,
      isActive: true,
      $or: [
        { firstName: { $regex: keyword, $options: 'i' } },
        { lastName: { $regex: keyword, $options: 'i' } },
        { nom: { $regex: keyword, $options: 'i' } },
        { prenoms: { $regex: keyword, $options: 'i' } },
        { fullName: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { specialties: { $elemMatch: { $regex: keyword, $options: 'i' } } },
        { bio: { $regex: keyword, $options: 'i' } },
        { presentation: { $regex: keyword, $options: 'i' } },
        { spiritualName: { $regex: keyword, $options: 'i' } },
        { spiritualQuote: { $regex: keyword, $options: 'i' } },
        { domains: { $elemMatch: { $regex: keyword, $options: 'i' } } },
        { methods: { $elemMatch: { $regex: keyword, $options: 'i' } } },
      ]
    };
    const consultants = await this.userModel
      .find(filter)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort({ rating: -1, consultationsCompleted: -1 })
      .limit(30)
      .exec();
    return { consultants };
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

  /**
   * Fonction utilitaire pour sauvegarder un fichier
   * Centralisé ici pour éviter la duplication de code
   */
  private async saveFile(file: Express.Multer.File, prefix: string): Promise<string> {
    if (!file || !file.buffer) {
      console.error(`[saveFile] Fichier ${prefix} invalide`);
      return '';
    }

    // Configuration des dossiers d'upload
    const uploadBaseDir = process.env.UPLOAD_DIR || '/var/www/uploads';
    const uploadDir = path.join(uploadBaseDir, 'mediums');
    const publicBaseUrl = process.env.PUBLIC_UPLOAD_URL || 'https://monetoile.org/uploads';
    const publicUrl = `${publicBaseUrl}/mediums`;

    // Création du dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      console.log(`[saveFile] Dossier créé: ${uploadDir}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const finalExt = validExts.includes(ext) ? ext : '.jpg';

    // Nettoyer le nom du fichier
    const sanitizeFileName = (originalname: string): string => {
      const baseName = path.basename(originalname, ext);
      const cleanBase = baseName
        .replace(/[éèêë]/g, 'e')
        .replace(/[àâä]/g, 'a')
        .replace(/[ôö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
        .substring(0, 50);
      return cleanBase || 'image';
    };

    const cleanBase = sanitizeFileName(file.originalname);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const uniqueName = `${prefix}-${cleanBase}-${timestamp}-${random}${finalExt}`;
    const destPath = path.join(uploadDir, uniqueName);

    try {
      fs.writeFileSync(destPath, file.buffer);
      console.log(`[saveFile] Fichier sauvegardé: ${destPath} (${file.buffer.length} bytes)`);
      const fileUrl = `${publicUrl}/${uniqueName}`;
      return fileUrl;
    } catch (error) {
      console.error(`[saveFile] Erreur sauvegarde ${prefix}:`, error);
      throw new Error(`Impossible de sauvegarder l'image ${prefix}`);
    }
  }

  /**
   * Inscription d'un médium (consultant) par un utilisateur connecté
   * La sauvegarde des fichiers est maintenant centralisée ici
   */
  async registerMedium(user: UserDocument, dto: any): Promise<any> {
    console.log('[registerMedium] Début du traitement');
    console.log('[registerMedium] User ID:', user._id);

    // Validation de la photo de profil
    if (!dto.photoFile) {
      console.error('[registerMedium] Photo manquante');
      throw new ConflictException('La photo de profil est obligatoire.');
    }

    // Vérifier que le fichier photo est valide
    if (!dto.photoFile.originalname || !dto.photoFile.buffer) {
      console.error('[registerMedium] Fichier photo invalide');
      throw new ConflictException('Le fichier photo est invalide.');
    }

    // Sauvegarde de la photo (obligatoire)
    let photoUrl = '';
    try {
      photoUrl = await this.saveFile(dto.photoFile, 'photo');
      if (!photoUrl) {
        throw new Error('Erreur lors de la sauvegarde de la photo');
      }
      console.log('[registerMedium] Photo sauvegardée:', photoUrl);
    } catch (error) {
      console.error('[registerMedium] Erreur sauvegarde photo:', error);
      throw new ConflictException('Erreur lors de la sauvegarde de la photo de profil');
    }

    // Sauvegarde du poster (optionnel)
    let posterUrl = '';
    if (dto.posterFile && dto.posterFile.originalname && dto.posterFile.buffer) {
      try {
        posterUrl = await this.saveFile(dto.posterFile, 'poster');
        console.log('[registerMedium] Poster sauvegardé:', posterUrl);
      } catch (error) {
        console.warn('[registerMedium] Erreur sauvegarde poster (non bloquante):', error);
      }
    }

    // Conversion des tableaux
    const specialties = Array.isArray(dto.specialties) ? dto.specialties : (dto.specialties ? [dto.specialties] : []);
    const domains = Array.isArray(dto.domains) ? dto.domains : (dto.domains ? [dto.domains] : []);
    const methods = Array.isArray(dto.methods) ? dto.methods : (dto.methods ? [dto.methods] : []);

    // Conversion de l'expérience
    let experienceYears = 0;
    if (dto.experience) {
      if (typeof dto.experience === 'string') {
        if (dto.experience.includes('>')) {
          experienceYears = parseInt(dto.experience.replace(/[^\d]/g, '')) + 1;
        } else if (dto.experience.includes('-')) {
          experienceYears = parseInt(dto.experience.split('-')[0]);
        } else {
          experienceYears = parseInt(dto.experience);
        }
        if (isNaN(experienceYears)) experienceYears = 0;
      } else if (typeof dto.experience === 'number') {
        experienceYears = dto.experience;
      }
    }

    // Mettre à jour l'utilisateur
    user.role = Role.CONSULTANT;
    user.presentation = dto.presentation || '';
    user.phone = dto.phone || '';
    user.videoLink = dto.videoLink || '';
    user.experienceYears = experienceYears;
    user.specialtyOther = dto.specialtyOther || '';
    user.specialties = specialties;
    user.domains = domains;
    user.methods = methods;
    user.nomconsultant = dto.nomconsultant || ''; // ← Ajout du champ nomconsultant
    user.photo = photoUrl;  // ← L'URL complète est stockée ici
    user.poster = posterUrl; // ← L'URL complète est stockée ici

    // Champs optionnels
    if (dto.spiritualName) user.spiritualName = dto.spiritualName;
    if (dto.spiritualQuote) user.spiritualQuote = dto.spiritualQuote;
    if (dto.message) user.message = dto.message;
    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.country) user.country = dto.country;
    if (dto.city) user.city = dto.city;

    console.log('[registerMedium] Données avant sauvegarde:', {
      photo: photoUrl,
      poster: posterUrl,
      role: user.role,
      specialties: specialties.length,
      domains: domains.length,
      methods: methods.length,
    });

    try {
      await user.save();
      console.log('[registerMedium] Utilisateur sauvegardé avec succès');
    } catch (err) {
      console.error('[registerMedium] Erreur lors de la sauvegarde:', err);
      throw err;
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user.toObject();
    
    return {
      ...userWithoutPassword,
      photoUrl: photoUrl,
      posterUrl: posterUrl,
    };
  }
}