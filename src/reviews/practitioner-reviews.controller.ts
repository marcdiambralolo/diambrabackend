import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PractitionerReviewsService } from './practitioner-reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('practitioner-reviews')
@UseGuards(JwtAuthGuard)
export class PractitionerReviewsController {
  constructor(private readonly reviewsService: PractitionerReviewsService) {}

  @Post()
  async createReview(@Body() body: any, @Req() req: Request) {
    const user = req.user as any;
    const { consultationId, comment, rating } = body;
    if (!consultationId || !comment || !rating) {
      throw new Error('consultationId, comment et rating sont requis');
    }
    return this.reviewsService.create({
      userId: user._id,
      author: user.username || user.nom || user.prenoms || 'Utilisateur',
      consultationId,
      comment,
      rating,
      createdAt: new Date(),
    });
  }

  @Get('by-consultation/:consultationId')
  async getByConsultation(@Param('consultationId') consultationId: string) {
    return this.reviewsService.findByConsultation(consultationId);
  }

  @Get('by-user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }
}
