import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

// Enforce IPv4-first DNS resolution to avoid Cloudflare WAF IPv6 blocks on banking endpoints (Nomba API)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Load .env before NestJS bootstrap without requiring external dotenv package
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  '/var/www/fundedgiants/.env',
  '/var/www/fundedgiants/apps/api/.env',
];
for (const p of envPaths) {
  try {
    if (typeof (process as any).loadEnvFile === 'function') {
      (process as any).loadEnvFile(p);
    } else if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (process.env[k] === undefined) {
            process.env[k] = v;
          }
        }
      }
    }
  } catch {}
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('FundedGiantsAPI');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  // Input validation with strict class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS configuration
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const allowedOrigins = [
        'https://fundedgiants.ng',
        'https://www.fundedgiants.ng',
        'https://trader.fundedgiants.ng',
        'https://admin.fundedgiants.ng',
        'https://giant.fundedgiants.ng',
        'https://api.fundedgiants.ng',
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (
        allowedOrigins.includes(requestOrigin) ||
        requestOrigin.endsWith('.fundedgiants.ng') ||
        requestOrigin === 'https://fundedgiants.ng'
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for production webhooks and custom origins
      }
    },
    credentials: true,
  });

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('FundedGiants Platform API')
    .setDescription('Production-grade REST API for FundedGiants trading, wallet, and risk platform')
    .setVersion('1.0')
    .addCookieAuth('fg_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`FundedGiants API is running on http://localhost:${port}/api/v1`);
  logger.log(`API Documentation available at http://localhost:${port}/docs`);
}

bootstrap();
