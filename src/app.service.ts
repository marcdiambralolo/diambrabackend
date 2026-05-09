import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Mon Étoile Backend API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getStatus() {
    return {
      api: 'Mon Étoile Backend',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
