import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelService } from '../excel/excel.service';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
    constructor(
        private readonly excelService: ExcelService,
        private readonly emailService: EmailService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.excelService.parseExcel(file.buffer);
    }

    @Post('send')
    async sendEmails(
        @Body() body: { template: string; subject: string; recipients: any[] },
    ) {
        if (!body || !body.template || !body.subject || !body.recipients) {
            throw new BadRequestException('Missing required fields: template, subject, or recipients');
        }
        const results = await this.emailService.sendBulkEmails(
            body.template,
            body.subject,
            body.recipients,
        );
        return { results };
    }
}
