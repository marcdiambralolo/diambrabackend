/* eslint-disable @typescript-eslint/no-var-requires */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/enums/permission.enum';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DeepseekService } from '../consultations/deepseek.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterMediumDto } from './dto/register-medium.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

@ApiTags('Utilisateurs')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly deepseekService: DeepseekService,
  ) { }

  @Get('consultants')
  @UseGuards(PermissionsGuard)
  @ApiOperation({
    summary: 'Lister les consultants',
    description: 'Retourne la liste de tous les consultants (utilisateurs avec le rôle CONSULTANT).',
  })
  @ApiResponse({ status: 200, description: 'Liste des consultants.' })
  findConsultants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, limit, role: Role.CONSULTANT, isActive, search });
  }

  @Get('me/sky-chart')
  async getMySkyChart(@CurrentUser() user: UserDocument) {
    const birthData = {
      nom: user.nom || '',
      prenoms: user.prenoms || '',
      genre: user.genre || user.gender || '',
      dateNaissance: user.dateNaissance ? user.dateNaissance.toISOString().slice(0, 10) : '',
      heureNaissance: user.heureNaissance || '',
      paysNaissance: user.paysNaissance || user.country || '',
      villeNaissance: user.villeNaissance || '',
      email: user.email,
    };
    return this.deepseekService.genererAnalyseComplete('birthData', '');
  }

  @Post('register-medium')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription médium',
    description: 'Permet à un utilisateur connecté de devenir médium (consultant).'
  })
  @ApiResponse({ status: 201, description: 'Candidature médium enregistrée.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'photo', maxCount: 1 },
    { name: 'poster', maxCount: 1 },
  ]))
  async registerMedium(
    @CurrentUser() user: UserDocument,
    @UploadedFiles() files: { photo?: Express.Multer.File[]; poster?: Express.Multer.File[] },
    @Body() body: any
  ) {
    console.log('[registerMedium] Début du traitement pour user:', user._id);
    console.log('[registerMedium] Fichiers reçus:', {
      photo: files?.photo?.length || 0,
      poster: files?.poster?.length || 0
    });

    const photo = files?.photo?.[0];
    const poster = files?.poster?.[0];

    // Vérification obligatoire de la photo
    if (!photo) {
      throw new Error('La photo de profil est obligatoire');
    }

    // Fonction pour extraire les tableaux des données du formulaire
    function extractArray(field: string) {
      if (Array.isArray(body[field])) return body[field];
      const keys = Object.keys(body).filter(k => k.startsWith(field + '['));
      if (keys.length > 0) {
        return keys.sort().map(k => body[k]);
      }
      if (typeof body[field] === 'string' && body[field]) return [body[field]];
      return [];
    }

    const specialties = extractArray('specialties');
    const domains = extractArray('domains');
    const methods = extractArray('methods');

    // Construction du DTO pour le service
    const registerData: any = {
      presentation: body.presentation || '',
      phone: body.phone || '',
      videoLink: body.videoLink || body.video || '',
      experience: body.experience || '',
      specialtyOther: body.specialtyOther || '',
      specialties,
      domains,
      methods,
      message: body.message || '',
      spiritualName: body.spiritualName || '',
      spiritualQuote: body.spiritualQuote || '',
      fullName: body.fullName || '',
      country: body.country || '',
      city: body.city || '',
      nomconsultant: body.nomconsultant || '',  
      // Passer les fichiers pour que le service les traite
      photoFile: photo,
      posterFile: poster,
    };

    // Appel au service qui gère maintenant la sauvegarde des fichiers
    const medium = await this.usersService.registerMedium(user, registerData);

    return {
      success: true,
      message: 'Candidature médium enregistrée',
      medium: {
        _id: medium._id,
        role: medium.role,
        photo: medium.photo,
        poster: medium.poster,
      },
      photoUrl: medium.photo,
      posterUrl: medium.poster,
    };
  }

  @Get('count')
  @ApiOperation({ summary: "Nombre d'abonnés", description: "Retourne le nombre total d'utilisateurs inscrits." })
  @ApiResponse({ status: 200, description: "Nombre d'abonnés." })
  async getSubscribersCount() {
    return { count: await this.usersService.getSubscribersCount() };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un utilisateur', description: 'Crée un nouvel utilisateur (réservé aux admins).' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Lister les utilisateurs', description: 'Retourne la liste de tous les utilisateurs (admin seulement).' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs.' })
  @Permissions(Permission.READ_ANY_USER)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, limit, role, isActive, search });
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.findOne(user._id.toString());
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: UserDocument, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user._id.toString(), updateUserDto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMyPassword(
    @CurrentUser() user: UserDocument,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user._id.toString(), changePasswordDto);
  }

  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  getStatistics() {
    return this.usersService.getStatistics();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_USER)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ROLES)
  assignRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.usersService.assignRole(id, role);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.DELETE_ANY_USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string) {
    await this.usersService.hardDelete(id);
  }

  @Get('consultants/search')
  @ApiOperation({
    summary: 'Recherche intelligente de consultants',
    description: 'Recherche sur nom, prénom, spécialités, bio, présentation, etc.'
  })
  @ApiResponse({ status: 200, description: 'Résultats de la recherche.' })
  async searchConsultants(@Query('q') q: string) {
    return this.usersService.searchConsultants(q);
  }
}