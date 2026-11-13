import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('FundedGiantsAPI');
  const app = await NestFactory.create(AppModule);

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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://fundedgiants.com'],
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
