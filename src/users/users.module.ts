import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsModule } from '../consultations/consultations.module';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consultation.name, schema: ConsultationSchema },
    ]),
    ConsultationsModule,
    HttpModule,
  ],
  controllers: [UsersController],
  providers: [UsersService,],
  exports: [UsersService,],
})
export class UsersModule { }
