
import { Controller, Get, Param, Post, Body, Patch, Query, UseGuards } from '@nestjs/common';
import { UserGradeProgressService } from './user-grade-progress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user-grade-progress')
export class UserGradeProgressController {
  constructor(private readonly userGradeProgressService: UserGradeProgressService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyGradeProgress(@CurrentUser() user: any) {
    return this.userGradeProgressService.getByUser(user._id, true);
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  async getProgress(@Param('userId') userId: string) {
    return this.userGradeProgressService.getByUser(userId);
  }

  @Get(':userId/current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@Param('userId') userId: string) {
    return this.userGradeProgressService.getCurrent(userId);
  }

  @Post(':userId/:grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async createOrUpdate(
    @Param('userId') userId: string,
    @Param('grade') grade: string,
    @Body() data: any,
  ) {
    return this.userGradeProgressService.createOrUpdate(userId, grade, data);
  }

  @Patch(':userId/:grade/increment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async incrementField(
    @Param('userId') userId: string,
    @Param('grade') grade: string,
    @Query('field') field: string,
    @Query('amount') amount: string,
  ) {
    return this.userGradeProgressService.incrementField(userId, grade, field as any, Number(amount) || 1);
  }
}
