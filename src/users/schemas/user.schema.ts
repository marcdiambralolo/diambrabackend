import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';

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

  @Prop({ default: 0, min: 0 })
  consultationsCount?: number;

  @Prop({ default: 0, min: 0 })
  totalConsultations?: number;

  @Prop({ default: 0, min: 0 })
  credits?: number; 

  @Prop({ default: 0 })
  consultationsCompleted?: number; // Nombre de consultations effectuées (pas seulement achetées)
 
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
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });