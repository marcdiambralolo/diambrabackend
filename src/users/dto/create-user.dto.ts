
import { IsString, IsEmail, IsOptional, IsNumber, Min, MaxLength, IsArray, IsBoolean, IsUrl, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

export class CreateUserDto {
    @IsString()
    @MaxLength(30)
    username: string;

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
    profilePicture?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    photo?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    spiritualName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    spiritualQuote?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    presentation?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specialties?: string[];

    @IsString()
    @IsOptional()
    @MaxLength(200)
    specialtyOther?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    domains?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    experienceYears?: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    message?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    fullName?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    idPhoto?: string;

    @IsBoolean()
    @IsOptional()
    ethical?: boolean;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    @IsUrl()
    videoLink?: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

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

    @IsOptional()
    @IsString()
    bio?: string;
  }
