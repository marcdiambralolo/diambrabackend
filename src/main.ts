import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseCookies(rawCookieHeader: string | undefined) {
  if (!rawCookieHeader) {
    return {} as Record<string, string>;
  }

  return rawCookieHeader.split(';').reduce<Record<string, string>>((accumulator, segment) => {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex <= 0) {
      return accumulator;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    accumulator[key] = decodeURIComponent(value);
    return accumulator;
  }, {});
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  const express = require('express');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use((req: any, _res: any, next: () => void) => {
    req.cookies = parseCookies(req.headers?.cookie);
    next();
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    forbidUnknownValues: false,
    validateCustomDecorators: true,
  }));

  const baseUrl = process.env.BASE_URL || 'https://diambra.net';
  const isDev = process.env.NODE_ENV !== 'production';

  const allowedOrigins = [
    baseUrl,
    baseUrl.replace('https://', 'https://www.'),
  ];

  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (fromEnv?.length) {
    allowedOrigins.push(...fromEnv);
  }

  if (isDev) {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Cache-Control',
      'Pragma',
      'Expires'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ✅ Préfixe global
  app.setGlobalPrefix('api/v1');

  // ✅ Démarrer le serveur
  const port = process.env.PORT || 3001;
  const server = await app.listen(port);
  server.setTimeout(600000); // 10 minutes

  console.log(`🚀 Serveur démarré sur ${baseUrl}/api/v1`);

}
bootstrap();