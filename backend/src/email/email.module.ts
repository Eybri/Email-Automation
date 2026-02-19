import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ExcelModule } from '../excel/excel.module';

@Module({
    imports: [ExcelModule],
    controllers: [EmailController],
    providers: [EmailService],
})
export class EmailModule { }
