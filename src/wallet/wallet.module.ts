import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef } from '@nestjs/common';
import { Consultation } from '../consultations/schemas/consultation.schema';
import { ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { ConsultationsModule } from '../consultations/consultations.module';
import { OfferingStockModule } from '../offerings/offering-stock.module';
import { OfferingsModule } from '../offerings/offerings.module';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { WalletOfferingsService } from './wallet-offerings.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Consultation.name, schema: ConsultationSchema },
    ]),
    OfferingsModule,
    forwardRef(() => OfferingStockModule),
    forwardRef(() => ConsultationsModule),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletOfferingsService],
  exports: [WalletService, WalletOfferingsService],
})
export class WalletModule {}
