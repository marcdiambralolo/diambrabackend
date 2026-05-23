
import { IsArray, IsBoolean, IsDateString, IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { Permission } from '../../common/enums/permission.enum';

export class CreateUserDto {
  @IsString()
  @MaxLength(30)
  username!: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPermissions?: Permission[];

  @IsOptional()
  @IsString()
  address?: string;


  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  prenoms?: string;










  @IsString()
  @IsOptional()
  villeNaissance?: string;

  @IsDateString()
  @IsOptional()
  dateNaissance?: string;

  @IsString()
  @IsOptional()
  heureNaissance?: string;

  @IsString()
  @Length(4, 4, { message: 'Le code secret doit contenir exactement 4 chiffres' })
  @Matches(/^\d{4}$/, { message: 'Le code secret doit être composé de 4 chiffres' })
  @IsOptional()
  secretCode?: string;
}