import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limits for large Excel files and attachments
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  const logger = new Logger('Bootstrap');

  // Only call listen if not in serverless environment
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    await app.listen(port);
    logger.log(`Backend is running on: http://localhost:${port}`);
  }

  return app.getHttpAdapter().getInstance();
}

// For local development
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  bootstrap();
}

// Default export for Vercel
export default async (req: any, res: any) => {
  const app = await bootstrap();
  app(req, res);
};
