import { GameConfiguration, GameConfigurationSchema } from '@/game/schemas/game-configuration.schema';
import { LearningConfiguration, LearningConfigurationSchema } from '@/learning/schemas/learning-configuration.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsModule } from '../consultations/consultations.module';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletTransaction, WalletTransactionSchema } from '../wallet/schemas/wallet-transaction.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    ConsultationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: GameConfiguration.name, schema: GameConfigurationSchema },
         { name: LearningConfiguration.name, schema: LearningConfigurationSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }