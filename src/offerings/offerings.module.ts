import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferingsController } from './offerings.controller';
import { OfferingsService } from './offerings.service';
import { Offering, OfferingSchema } from './schemas/offering.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offering.name, schema: OfferingSchema },
    ]),
  ],
  controllers: [OfferingsController],
  providers: [OfferingsService],
  exports: [OfferingsService],
})
export class OfferingsModule {}
