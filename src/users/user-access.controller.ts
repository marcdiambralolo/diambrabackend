import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserAccessService } from './user-access.service';

@ApiTags('User Access')
@Controller('user-access')
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  @Get('subscription-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Récupérer les informations d\'abonnement de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Informations d\'abonnement retournées',
  })
  async getMySubscriptionInfo(@Req() req: Request & { user: any }) {
    return this.userAccessService.getSubscriptionInfo(req.user._id);
  }

  @Get('subscription-info/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Récupérer les informations d\'abonnement d\'un utilisateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Informations d\'abonnement retournées',
  })
  async getUserSubscriptionInfo(@Param('userId') userId: string) {
    return this.userAccessService.getSubscriptionInfo(userId);
  }

  @Post('check-access/:rubriqueId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Vérifier si l\'utilisateur connecté a accès à une rubrique',
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification d\'accès',
  })
  async checkMyAccessToRubrique(
    @Req() req: Request & { user: any },
    @Param('rubriqueId') rubriqueId: string,
  ): Promise<{ hasAccess: boolean }> {
    const hasAccess = await this.userAccessService.hasAccessToRubrique(
      req.user._id,
      rubriqueId,
    );
    return { hasAccess };
  }

  @Post('activate-premium')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activer un abonnement Premium pour l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement Premium activé',
  })
  async activateMyPremium(
    @Req() req: Request & { user: any },
    @Body() body: { rubriqueId: string; durationInDays?: number },
  ): Promise<{ success: boolean }> {
    await this.userAccessService.activatePremiumSubscription(
      req.user._id,
      body.rubriqueId,
      body.durationInDays,
    );
    return { success: true };
  }

  @Post('activate-integral')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activer un abonnement Intégral pour l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement Intégral activé',
  })
  async activateMyIntegral(
    @Req() req: Request & { user: any },
    @Body() body: { durationInDays?: number },
  ): Promise<{ success: boolean }> {
    await this.userAccessService.activateIntegralSubscription(
      req.user._id,
      body.durationInDays,
    );
    return { success: true };
  }

  @Delete('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Annuler l\'abonnement de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement annulé',
  })
  async cancelMySubscription(@Req() req: Request & { user: any }): Promise<{ success: boolean }> {
    await this.userAccessService.cancelSubscription(req.user._id);
    return { success: true };
  }
}
