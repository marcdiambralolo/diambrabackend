import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PractitionerReview, PractitionerReviewSchema } from './schemas/practitioner-review.schema';
import { PractitionerReviewsService } from './practitioner-reviews.service';
import { PractitionerReviewsController } from './practitioner-reviews.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PractitionerReview.name, schema: PractitionerReviewSchema },
    ]),
  ],
  providers: [PractitionerReviewsService],
  controllers: [PractitionerReviewsController],
  exports: [PractitionerReviewsService],
})
export class PractitionerReviewsModule {}
