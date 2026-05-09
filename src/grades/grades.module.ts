import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rubrique, RubriqueSchema } from '../rubriques/rubrique.schema';
import { GradeConfigController } from './grade-config.controller';
import { GradeConfigService } from './grade-config.service';
import { GradeConfig, GradeConfigSchema } from './schemas/grade-config.schema';
 
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GradeConfig.name, schema: GradeConfigSchema },
       { name: Rubrique.name, schema: RubriqueSchema },
    ]),
  ],
  controllers: [GradeConfigController],
  providers: [GradeConfigService],
  exports: [GradeConfigService],
})
export class GradesModule { }