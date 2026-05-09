import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGradeProgress, UserGradeProgressSchema } from './schemas/user-grade-progress.schema';
import { UserGradeProgressService } from './user-grade-progress.service';
import { UserGradeProgressController } from './user-grade-progress.controller';
import { Rubrique, RubriqueSchema } from '../rubriques/rubrique.schema';
import { RubriqueModule } from '../rubriques/rubrique.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserGradeProgress.name, schema: UserGradeProgressSchema },
      { name: Rubrique.name, schema: RubriqueSchema },
    ]),
    RubriqueModule,
  ],
  providers: [UserGradeProgressService],
  controllers: [UserGradeProgressController],
  exports: [UserGradeProgressService],
})
export class UserGradeProgressModule {}
