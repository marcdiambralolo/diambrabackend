import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { OfferingStockService } from './offering-stock.service';
import { Types } from 'mongoose';
import { UserOffering, WalletOfferingsService } from '../wallet/wallet-offerings.service';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('offering-stock')
export class OfferingStockController {
  constructor(
    private readonly offeringStockService: OfferingStockService,
    @Inject(forwardRef(() => WalletOfferingsService))
    private readonly walletOfferingsService: WalletOfferingsService,
  ) {}

  @Post('increment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async increment(
    @Body() body: { offeringId: string; name: string; quantity: number; category?: string }
  ) {
    return this.offeringStockService.incrementStock(
      new Types.ObjectId(body.offeringId),
      body.name,
      body.quantity,
      // icon supprimé,
      body.category
    );
  }

  @Post('decrement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async decrement(
    @Body() body: { offeringId: string; quantity: number }
  ) {
    return this.offeringStockService.decrementStock(
      new Types.ObjectId(body.offeringId),
      body.quantity
    );
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async available(@CurrentUser() user: UserDocument): Promise<UserOffering[]> {
    const currentUserId = user?._id?.toString();

    if (!currentUserId) {
      return [];
    }

    const userOfferings = await this.walletOfferingsService.getUserOfferings(currentUserId);
    return userOfferings.filter(o => o.quantity > 0);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async all() {
    return this.offeringStockService.getAll();
  }
}
