
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('users/me/doors-job')
@UseGuards(JwtAuthGuard)
export class DoorsJobController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @Post()
  async processJob(@CurrentUser() user: any, @Body() body: any) {
    const userId = String(user?._id || user?.id || user);
    const formData = body.formData;
    try {
      await this.usersService.update(userId, { ...formData, premium: true, });
      return { success: true, consultations: [] };
    } catch (error) {
      return { success: false, error: typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error) || 'Erreur inconnue' };
    }
  }
}
