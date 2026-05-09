import { Body, Controller, Get, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletOfferingsService } from './wallet-offerings.service';
import { ConsumeOfferingsDto } from './dto/consume-offerings.dto';
import { ValidateConsultationOfferingsDto } from './dto/validate-consultation-offerings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletOfferingsService: WalletOfferingsService,
  ) { }

  @Post('transactions')
  async create(@Body() dto: CreateWalletTransactionDto, @CurrentUser() user: UserDocument) {
    const transaction = await this.walletService.createTransaction(dto, user._id.toString());
    return { transaction };
  }

  @Post('offerings/add')
  async addOfferings(@Body() dto: CreateWalletTransactionDto, @CurrentUser() user: UserDocument) {
    const transaction = await this.walletService.createTransaction(dto, user._id.toString());
    return { transaction };
  }


  @Get('transactions/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    // Recherche par _id Mongo OU transactionId
    const tx = await this.walletService.findTransactionByIdOrTransactionId(id, user._id.toString());
    if (!tx) {
      throw new NotFoundException('Transaction introuvable');
    }
    return tx;
  }

  @Get('transactions')
  async findAll(@CurrentUser() user: UserDocument) {
    const transactions = await this.walletService.getTransactionsByUser(user._id.toString());
    return { transactions };
  }

  @Post('consume-offerings')
  async consumeOfferings(@Body() dto: ConsumeOfferingsDto, @CurrentUser() user: UserDocument): Promise<any> {
    return this.walletOfferingsService.consumeOfferings(user._id.toString(), dto.consultationId, dto.offerings);
  }

  @Post('consultations/:consultationId/validate-offerings')
  async validateConsultationOfferings(
    @Param('consultationId') consultationId: string,
    @Body() dto: ValidateConsultationOfferingsDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.walletOfferingsService.validateConsultationOfferings(
      user._id.toString(),
      consultationId,
      dto.offerings,
    );
  }
}
