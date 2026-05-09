import { Controller, Post } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SiteMetricsService } from './site-metrics.service';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly metricsService: SiteMetricsService,
  ) {}

  @Post()
  async getStats() {
    const subscribers = await this.usersService.getSubscribersCount();
    const visits = await this.metricsService.getVisits();
    return { subscribers, visits };
  }
}