import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { BooksModule } from './books/books.module';
import { CategoriesModule } from './categories/categories.module';
import { SiteMetricsModule } from './common/site-metrics.module';
import { ConfigModule as CustomConfigModule } from './config/config.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { GradesModule } from './grades/grades.module';
import { MoneyfusionModule } from './moneyfusion/moneyfusion.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OfferingStockModule } from './offerings/offering-stock.module';
import { OfferingsModule } from './offerings/offerings.module';
import { PaymentsModule } from './payments/payments.module';
import { RubriqueModule } from './rubriques/rubrique.module';
import { ServicesModule } from './services/services.module';
import { UploadModule } from './uploads/upload.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { UserGradeProgressModule } from './users/user-grade-progress.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnalysisGateway } from './analysis.gateway';
import { AnalysisStatusSubscriber } from './analysis-status.subscriber';
import { RedisModule } from './redis/redis.module';
import { DoorsJobModule } from './doors-job/doors-job.module';
import { DoorsJobController } from './doors-job/doors-job.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60),
            limit: configService.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('REDIS_PASSWORD');
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            ...(password ? { password } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ConsultationsModule,
    ServicesModule,
    PaymentsModule,
    NotificationsModule,
    MoneyfusionModule,
    SiteMetricsModule,
    AdminModule,
    BooksModule,
    BlogModule,
    WalletModule,
    OfferingsModule,
    OfferingStockModule,
    RubriqueModule,
    CategoriesModule,
    GradesModule,
    CustomConfigModule,
    UploadModule,
    UserGradeProgressModule,
    RedisModule,
    MessagingModule,
    DoorsJobModule,
  ],
  controllers: [AppController, DoorsJobController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AnalysisGateway,
    AnalysisStatusSubscriber,
  ],
})
export class AppModule { }