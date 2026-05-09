import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferingStock, OfferingStockSchema } from './schemas/offering-stock.schema';
import { OfferingStockService } from './offering-stock.service';
import { OfferingStockController } from './offering-stock.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OfferingStock.name, schema: OfferingStockSchema },
    ]),
    forwardRef(() => WalletModule),
  ],
  controllers: [OfferingStockController],
  providers: [OfferingStockService],
  exports: [OfferingStockService],
})
export class OfferingStockModule {}
