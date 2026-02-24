import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ExcelModule } from '../excel/excel.module';

@Module({
    imports: [ExcelModule, ConfigModule],
    controllers: [EmailController],
    providers: [EmailService],
})
export class EmailModule { }
