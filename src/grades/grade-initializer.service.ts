import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GradeConfigService } from './grade-config.service';

/**
 * Grade initialization service
 * Automatically initializes grades when the module loads if they don't exist
 */
@Injectable()
export class GradeInitializerService implements OnModuleInit {
  private readonly logger = new Logger(GradeInitializerService.name);

  constructor(private readonly gradeConfigService: GradeConfigService) {}

  /**
   * Called when the module is initialized
   * Checks if grades exist, and creates them if not
   */
  async onModuleInit() {
    try {
      this.logger.log('🚀 Initializing grade configurations...');
      const grades = await this.gradeConfigService.initializeGrades();
      this.logger.log(
        `✅ Grade initialization completed. Found ${grades.length} grades.`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Error during grade initialization:',
        error instanceof Error ? error.message : error,
      );
      // Don't throw - let app continue even if grades init fails
    }
  }
}
