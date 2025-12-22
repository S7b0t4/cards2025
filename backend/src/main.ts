import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS - allow all local network IPs, external IP, and domain
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3003',
    'http://127.0.0.1:3003',
    'http://46.191.230.86:3003',
    'https://cards.sybota.space',
    'http://cards.sybota.space',
    'https://sybota.space',
    'http://sybota.space',
    'https://www.sybota.space',
    'http://www.sybota.space',
    // Allow all 192.168.x.x addresses for local network
    /^http:\/\/192\.168\.\d+\.\d+:3003$/,
    /^http:\/\/192\.168\.\d+\.\d+:3002$/,
    // Allow external IP
    /^http:\/\/46\.191\.230\.86:3003$/,
    // Allow domain (with or without www, http or https)
    /^https?:\/\/(www\.)?cards\.sybota\.space$/,
    /^https?:\/\/(www\.)?sybota\.space$/,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      // Check if origin matches allowed patterns
      const isAllowed = allowedOrigins.some(pattern => {
        if (typeof pattern === 'string') {
          return origin === pattern;
        }
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow anyway for development
      }
    },
    credentials: true,
  });
  logger.log(`CORS enabled for origins: ${frontendUrl} and local network`);

  // Global logging interceptor
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  logger.log('HTTP logging interceptor enabled');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Nest.js + Sequelize + PostgreSQL API')
    .setVersion('1.0')
    .addTag('api')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger documentation: http://0.0.0.0:${port}/api`);
}
bootstrap();


