import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ConfigController],
})
export class ConfigModule {}