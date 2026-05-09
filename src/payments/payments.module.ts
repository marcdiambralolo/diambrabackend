import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { PaymentsService } from './payments.service';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { BooksModule } from '../books/books.module';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    BooksModule,
    ConsultationsModule,
    HttpModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentVerificationService],
  exports: [PaymentsService, PaymentVerificationService],
})
export class PaymentsModule {}
