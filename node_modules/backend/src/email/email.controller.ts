import { Controller, Post, UseInterceptors, UploadedFiles, Body, BadRequestException, Logger, UseGuards, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import axios from 'axios';
import { ExcelService } from '../excel/excel.service';
import { EmailService } from './email.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('email')
@UseGuards(FirebaseAuthGuard)
export class EmailController {
    private readonly logger = new Logger(EmailController.name);

    constructor(
        private readonly excelService: ExcelService,
        private readonly emailService: EmailService,
    ) { }

    @Post('upload')
    @UseInterceptors(FilesInterceptor('files'))
    async uploadFile(
        @UploadedFiles() files: Express.Multer.File[],
        @Req() req: any,
    ) {
        const file = files?.[0];
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        this.logger.log(`Upload by user: ${req.user?.email}`);
        return this.excelService.parseExcel(file.buffer);
    }

    @Post('upload-url')
    async uploadFileFromUrl(
        @Body() body: { url: string },
        @Req() req: any,
    ) {
        let url = body.url;
        if (!url) {
            throw new BadRequestException('URL is required');
        }

        this.logger.log(`URL Upload by user: ${req.user?.email} | URL: ${url}`);

        // Handle Google Sheets links
        if (url.includes('docs.google.com/spreadsheets')) {
            // Extract the spreadsheet ID
            const matches = url.match(/\/d\/(.*?)(\/|$)/);
            if (matches && matches[1]) {
                const sheetId = matches[1];
                url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
                this.logger.log(`Transformed Google Sheets URL to export URL: ${url}`);
            }
        }

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 10000,
            });
            const buffer = Buffer.from(response.data);
            return this.excelService.parseExcel(buffer);
        } catch (error) {
            this.logger.error(`Failed to fetch file from URL: ${error.message}`);
            throw new BadRequestException(`Failed to fetch file from URL: ${error.message}. Please ensure the link is publicly accessible.`);
        }
    }

    @Post('send')
    @UseInterceptors(FilesInterceptor('attachments', 10, {
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB per attachment
    }))
    async sendEmails(
        @Body() body: { template: string; subject: string; recipients: string },
        @UploadedFiles() attachments: Express.Multer.File[],
        @Req() req: any,
    ) {
        this.logger.log(`Send request by user: ${req.user?.email} | Subject: ${body.subject}`);

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

        // Validate total attachment size (SMTP limits)
        const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);
        const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
        if (totalSize > MAX_TOTAL_SIZE) {
            this.logger.error(`Total attachment size too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
            throw new BadRequestException(`Total attachment size exceeds the 20MB limit. Current size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        }

        const googleAccessToken = req.headers['x-google-access-token'];
        const userEmail = req.user?.email;

        this.logger.log(`DEBUG: Backend received request. User: ${userEmail}, Token: ${googleAccessToken ? 'PRESENT' : 'MISSING'}`);

        this.logger.log(`SMTP Request: User=${userEmail}, Token=${googleAccessToken ? 'PRESENT' : 'MISSING'}`);

        const results = await this.emailService.sendBulkEmails(
            body.template,
            body.subject,
            recipientsArr,
            attachments,
            googleAccessToken,
            userEmail,
        );
        return { results };
    }
}
