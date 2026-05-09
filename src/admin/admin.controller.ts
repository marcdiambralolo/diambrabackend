import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { AdminService } from './admin.service';
import { BatchAnalysisJobsDto, BatchAnalysisStatusesDto } from './dto/batch-analysis-jobs.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {

  constructor(private readonly adminService: AdminService) { }

  @Post('users')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CREATE_USER)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Delete('users/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.DELETE_ANY_USER)
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('stats')
  @ApiOperation({ summary: "Récupérer les statistiques d'administration" })
  @ApiResponse({ status: 200, description: 'Statistiques retournées.' })
  async getStats() {
    const stats = await this.adminService.getStats();
    return stats;
  }

  @Get('offerings/stats')
  @ApiOperation({ summary: 'Statistiques des ventes d\'offrandes' })
  @ApiResponse({ status: 200, description: 'Statistiques des ventes retournées.' })
  async getOfferingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getOfferingSalesStats({ startDate, endDate });
  }

  @Get('users')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_USER)
  @ApiOperation({ summary: 'Lister les utilisateurs (admin)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  async getUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.adminService.getUsers({
      search,
      status,
      role,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 10,
    });

    return result;
  }

  @Get('consultations')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Lister les consultations (admin)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des consultations' })
  async getConsultations(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '18',
  ) {
    const result = await this.adminService.getConsultations({
      search, status, type,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 18,
    });
    return result;
  }

  @Post('consultations/analysis-jobs')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Enfiler plusieurs analyses en batch (admin)' })
  @ApiResponse({ status: 202, description: 'Jobs d’analyse créés ou déjà présents.' })
  async enqueueAnalysisJobs(@Body() body: BatchAnalysisJobsDto) {
    return this.adminService.enqueueAnalysisJobs(body.consultationIds);
  }

  @Post('consultations/analysis-jobs/statuses')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer plusieurs statuts de jobs d’analyse (admin)' })
  @ApiResponse({ status: 200, description: 'Statuts batch retournés.' })
  async getAnalysisJobsStatuses(@Body() body: BatchAnalysisStatusesDto) {
    return this.adminService.getAnalysisJobsStatuses(body.consultationIds);
  }

  @Get('payments')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_PAYMENT)
  @ApiOperation({ summary: 'Lister les paiements (admin)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des paiements' })
  async getPayments(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '18',
  ) {
    const result = await this.adminService.getPayments({
      search,
      status,
      method,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 18,
    });

    return result;
  }

  @Get('users/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_USER)
  @ApiOperation({ summary: "Récupérer les détails d'un utilisateur" })
  @ApiResponse({ status: 200, description: "Détails de l'utilisateur" })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_USER)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }
}