import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

let cachedApp: any;

export async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule);

  // Increase payload limits for large Excel files and attachments
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  const logger = new Logger('Bootstrap');

  // Only call listen if not in serverless environment
  if (process.env.NODE_ENV !== 'production' || (process.env.VERCEL !== '1' && !process.env.NOW_REGION)) {
    await app.listen(port);
    logger.log(`Backend is running on: http://localhost:${port}`);
  }

  await app.init();
  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

// For local development
if (process.env.NODE_ENV !== 'production' || (process.env.VERCEL !== '1' && !process.env.NOW_REGION)) {
  bootstrap();
}

// Default export for Vercel
export default async (req: any, res: any) => {
  const app = await bootstrap();
  app(req, res);
};
