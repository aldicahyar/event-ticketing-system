import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app: any = await NestFactory.create(AppModule, new FastifyAdapter() as any, { rawBody: true });

  const configService: ConfigService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3001');

  // Register Fastify plugins
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
  });

  // CORS configuration
  await app.register(cors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
  });

  await app.register(compress);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ===== CMS: media uploads (multipart) + static serving =====
  // Multipart is consumed manually in MediaController via req.file().
  const maxUploadMb = Number(configService.get('UPLOAD_MAX_MB', 10));
  await app.register(multipart, {
    limits: {
      fileSize: maxUploadMb * 1024 * 1024,
      files: 1,
    },
  });

  // Serve uploaded assets. Keep the URL prefix in sync with UPLOAD_URL_PREFIX
  // used by LocalStorageService (default "/uploads").
  const uploadDir = configService.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads');
  const uploadPrefix =
    '/' + (configService.get<string>('UPLOAD_URL_PREFIX') || '/uploads').replace(/^\/+|\/+$/g, '') + '/';
  // @fastify/static requires the root to exist at registration time.
  mkdirSync(uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: uploadPrefix,
    decorateReply: false, // avoid clashing with other plugins that add reply.sendFile
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ===== Primary API docs (auto-generated from NestJS decorators) =====
  const autoConfig = new DocumentBuilder()
    .setTitle('Event Ticketing System API')
    .setDescription('API documentation for Event Ticketing System (auto-generated)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();
  const autoDocument = SwaggerModule.createDocument(app, autoConfig);
  SwaggerModule.setup('api/docs', app, autoDocument);

  // ===== RBAC API docs (served from static YAML file) =====
  // Open http://localhost:3000/swagger to view the RBAC spec.
  try {
    const yamlPath = join(process.cwd(), 'docs', 'rbac-openapi.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const rbacDocument = parseYaml(yamlContent);
    SwaggerModule.setup('swagger', app, rbacDocument);
    logger.log('📖 RBAC Swagger UI: http://localhost:3000/swagger');
  } catch (err: any) {
    logger.warn(`Could not load RBAC swagger YAML: ${err.message}`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📚 API endpoints ready at: http://localhost:${port}/api/v1`);
  logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔓 CORS enabled for: ${corsOrigin}`);
}

bootstrap();
