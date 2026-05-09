import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MoneyfusionService } from './moneyfusion.service';
import { CreatePaymentDto, ArticleDto, PersonalInfoDto } from './dto/create-payment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('MoneyFusion')
@Controller('moneyfusion')
export class MoneyfusionController {
  constructor(private readonly moneyfusionService: MoneyfusionService) {}

  @Post('payment')
  @ApiOperation({ summary: 'Créer une demande de paiement MoneyFusion' })
  @ApiResponse({ status: 201, description: 'Demande de paiement créée.' })
  @ApiTags('MoneyFusion')
  @ApiExtraModels(CreatePaymentDto, ArticleDto, PersonalInfoDto)
  @HttpCode(HttpStatus.CREATED)
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.moneyfusionService.createPayment(dto);
  }

  @Get('payment/:token')
  @ApiOperation({ summary: "Vérifier l'état d'un paiement MoneyFusion" })
  @ApiResponse({ status: 200, description: 'Détails du paiement.' })
  @ApiParam({ name: 'token', required: true, description: 'Token du paiement MoneyFusion' })
  checkPaymentStatus(@Param('token') token: string) {
    return this.moneyfusionService.checkPaymentStatus(token);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Recevoir les notifications MoneyFusion (webhook)' })
  @ApiResponse({ status: 200, description: 'Notification reçue.' })
  @ApiBody({
    schema: {
      example: {
        event: 'payment_success',
        token: '123456TOKEN',
        amount: 100,
      },
    },
    description: 'Payload envoyé par MoneyFusion lors d’un webhook.',
  })
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: any) {
    return this.moneyfusionService.handleWebhook(payload);
  }
}
