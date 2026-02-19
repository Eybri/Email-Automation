import { Controller, Post, UseInterceptors, UploadedFiles, Body, BadRequestException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ExcelService } from '../excel/excel.service';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
    private readonly logger = new Logger(EmailController.name);

    constructor(
        private readonly excelService: ExcelService,
        private readonly emailService: EmailService,
    ) { }

    @Post('upload')
    @UseInterceptors(FilesInterceptor('file'))
    async uploadFile(@UploadedFiles() files: Express.Multer.File[]) {
        const file = files?.[0];
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.excelService.parseExcel(file.buffer);
    }

    @Post('send')
    @UseInterceptors(FilesInterceptor('attachments', 10, {
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB per attachment
    }))
    async sendEmails(
        @Body() body: { template: string; subject: string; recipients: string },
        @UploadedFiles() attachments: Express.Multer.File[],
    ) {
        this.logger.log(`Received send request. Subject: ${body.subject}`);

        if (!body || !body.template || !body.subject || !body.recipients) {
            this.logger.error('Missing required fields', body);
            throw new BadRequestException('Missing required fields: template, subject, or recipients');
        }

        // Since recipients comes as a string in multipart, we parse it
        let recipientsArr: any[];
        try {
            recipientsArr = JSON.parse(body.recipients);
        } catch (e) {
            throw new BadRequestException('Invalid recipients format. Expected JSON string.');
        }

        const results = await this.emailService.sendBulkEmails(
            body.template,
            body.subject,
            recipientsArr,
            attachments,
        );
        return { results };
    }
}
