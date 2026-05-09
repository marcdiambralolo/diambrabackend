import { Controller, Get, Post } from '@nestjs/common';
import { SiteMetricsService } from './site-metrics.service';

@Controller('metrics')
export class SiteMetricsController {
  constructor(private readonly metricsService: SiteMetricsService) {}

  @Post('visit')
  async incrementVisits() {
    const visits = await this.metricsService.incrementVisits();
    return { visits };
  }

  @Get('visits')
  async getVisits() {
    const visits = await this.metricsService.getVisits();
    return { visits };
  }
}
