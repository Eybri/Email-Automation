import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailModule } from './email/email.module';
import { ExcelModule } from './excel/excel.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST'),
          port: parseInt(configService.get<string>('SMTP_PORT')!, 10),
          secure: true, // true for 465, false for other ports
          auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: configService.get('FROM_EMAIL'),
        },
      }),
      inject: [ConfigService],
    }),
    FirebaseModule,
    AuthModule,
    EmailModule,
    ExcelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
