import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Diambra Backend API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getStatus() {
    return {
      api: 'Diambra Backend',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
