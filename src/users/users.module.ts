import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsModule } from '../consultations/consultations.module';
import { DeepseekService } from '../consultations/deepseek.service';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { GradeConfig, GradeConfigSchema } from '../grades/schemas/grade-config.schema';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserAccessController } from './user-access.controller';
import { UserAccessService } from './user-access.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserGradeProgressModule } from './user-grade-progress.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: GradeConfig.name, schema: GradeConfigSchema },
    ]),
    ConsultationsModule,
    HttpModule,
    UserGradeProgressModule,
  ],
  controllers: [UsersController, GradeController, UserAccessController],
  providers: [UsersService, DeepseekService, GradeService, UserAccessService],
  exports: [UsersService, GradeService, UserAccessService],
})
export class UsersModule {}
