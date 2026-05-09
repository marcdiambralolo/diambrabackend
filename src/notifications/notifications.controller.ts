import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationType } from './schemas/notification.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Récupérer les préférences de notification
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return await this.notificationsService.getPreferences(userId);
  }

  /**
   * Mettre à jour les préférences de notification
   */
  @Patch('preferences')
  async updatePreferences(@CurrentUser() user: any, @Body() preferences: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return await this.notificationsService.updatePreferences(userId, preferences);
  }

  /**
   * Récupérer mes notifications
   */
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
  ) {
    const query: any = {
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (type) {
      query.type = type;
    }

    // Correction : utiliser l'identifiant MongoDB réel
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.findAllByUser(userId, query);
  }

  /**
   * Récupérer le nombre de notifications non lues
   */
  @Get('unread/count')
  getUnreadCount(@CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.getUnreadCount(userId);
  }

  /**
   * Marquer une notification comme lue
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.markAsRead(id, userId);
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  @Post('mark-all-read')
  markAllAsRead(@CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Supprimer une notification
   */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.remove(id, userId);
  }

  /**
   * Supprimer toutes les notifications lues
   */
  @Delete('read/all')
  removeAllRead(@CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub?.toString();
    return this.notificationsService.removeAllRead(userId);
  }
}
