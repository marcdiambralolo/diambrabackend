

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { UserGrade } from '../../common/enums/user-grade.enum';
import { UserType } from '../../common/enums/user-type.enum';

export type UserDocument = User & Document;

/**
 * Schéma MongoDB optimisé pour les utilisateurs
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, index: true })
  username!: string;

  @Prop({ required: false, enum: ['male', 'female'] })
  gender!: string;

  @Prop({ type: String, maxlength: 100 })
  nomconsultant?: string;

  @Prop({ type: Object })
  aspectsTexte?: any;

    @Prop({ type: Object })
  aspectsTexteBrute?: any;

  @Prop({ trim: true })
  nom?: string; // Nom de famille

  @Prop({ trim: true })
  prenoms?: string; // Prénoms

  @Prop({ trim: true })
  genre?: string;

  @Prop({ type: Date })
  dateNaissance?: Date;

  @Prop({ trim: true })
  paysNaissance?: string;

  @Prop({ trim: true })
  villeNaissance?: string;

  @Prop({ trim: true })
  heureNaissance?: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({
    type: String,
    enum: Role,
    default: Role.USER,
  })
  role?: Role;

  @Prop({
    type: [String],
    enum: Permission,
    default: [],
  })
  customPermissions?: Permission[];

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  address?: string;


  @Prop()
  profilePicture?: string;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: false })
  premium?: boolean;

  @Prop({ default: false })
  emailVerified?: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop()
  lastLogin?: Date;

  @Prop()
  currentRefreshTokenHash?: string;

  @Prop({ type: Date })
  currentRefreshTokenIssuedAt?: Date;

  @Prop({
    type: {
      language: { type: String, default: 'fr' },
      notifications: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    default: {},
  })
  preferences?: {
    language?: string;
    notifications?: boolean;
    newsletter?: boolean;
  }; 
  
  @Prop()
  bio?: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating?: number;

  @Prop({ default: 0, min: 0 })
  consultationsCount?: number;

  @Prop({ default: 0, min: 0 })
  totalConsultations?: number;

  @Prop({ default: 0, min: 0 })
  credits?: number;

  // Système de grades initiatiques
  @Prop({ type: String, enum: UserGrade, default: UserGrade.NEOPHYTE })
  grade?: UserGrade;

  @Prop({ default: 0 })
  consultationsCompleted?: number; // Nombre de consultations effectuées (pas seulement achetées)

  @Prop({ default: 0 })
  rituelsCompleted?: number; // Nombre de rituels/invocations réalisés

  @Prop({ default: 0 })
  booksRead?: number; // Nombre de livres lus/contenus complétés

  @Prop({ type: Date })
  lastGradeUpdate?: Date;

  // Système de profils utilisateurs
  @Prop({ type: String, enum: UserType, default: UserType.BASIQUE })
  userType?: UserType;

  @Prop({ type: Types.ObjectId, ref: 'Rubrique' })
  premiumRubriqueId?: Types.ObjectId; // Rubrique autorisée pour Premium

  @Prop({ type: Date })
  subscriptionStartDate?: Date; // Date de début d'abonnement Premium/Intégral

  @Prop({ type: Date })
  subscriptionEndDate?: Date; // Date de fin d'abonnement Premium/Intégral

  @Prop({ type: String, maxlength: 255 })
  photo?: string; // URL or path to profile photo

  @Prop({ type: String, maxlength: 100 })
  spiritualName?: string;

  @Prop({ type: String, maxlength: 255 })
  spiritualQuote?: string;

  @Prop({ type: String, maxlength: 1000 })
  presentation?: string;

  @Prop({ type: [String], default: [] })
  specialties?: string[];

  @Prop({ type: String, maxlength: 200 })
  specialtyOther?: string;

  @Prop({ type: [String], default: [] })
  methods?: string[];
  
  @Prop({ type: [String], default: [] })
  domains?: string[];

  @Prop({ type: Number, min: 0 })
  experienceYears?: number;

  @Prop({ type: String, maxlength: 500 })
  message?: string;

  @Prop({ type: String, maxlength: 100 })
  fullName?: string;

  @Prop({ type: String, maxlength: 30 })
  phone?: string;

  @Prop({ type: String, maxlength: 100 })
  country?: string;

  @Prop({ type: String, maxlength: 100 })
  city?: string;

  @Prop({ type: String, maxlength: 255 })
  idPhoto?: string; // URL or path to ID photo

  @Prop({ type: String, maxlength: 255 })
  poster?: string; // URL or path to poster image

  @Prop({ type: Boolean, default: false })
  ethical?: boolean;

  @Prop({ type: String, maxlength: 255 })
  videoLink?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes supplémentaires pour optimiser les requêtes fréquentes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ specialties: 1 });
UserSchema.index({ rating: -1 });
UserSchema.index({ grade: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ subscriptionEndDate: 1 });
