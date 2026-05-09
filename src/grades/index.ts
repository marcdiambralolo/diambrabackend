// Export schemas
export { GradeConfig,  GradeRequirements } from './schemas/grade-config.schema';

// Export DTOs
export { UpdateGradeConfigDto } from './dto/update-grade-config.dto';
export { ReorderGradeChoicesDto, ReorderChoiceDto } from './dto/reorder-grade-choices.dto';
// export UpdateNextGradeDto supprimé

// Export services
export { GradeConfigService } from './grade-config.service';
export { GradeInitializerService } from './grade-initializer.service';

// Export controller
export { GradeConfigController } from './grade-config.controller';

// Export module
export { GradesModule } from './grades.module';
