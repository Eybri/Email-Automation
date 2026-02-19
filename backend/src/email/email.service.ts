import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
    constructor(private readonly mailerService: MailerService) { }

    async sendBulkEmails(
        template: string,
        subject: string,
        recipients: any[],
        attachments: Express.Multer.File[] = []
    ) {
        const results: any[] = [];

        const mailAttachments = attachments.map(file => ({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
        }));

        for (const recipient of recipients) {
            let personalizedBody = template;
            let personalizedSubject = subject;

            // Replace placeholders in subject and body
            Object.keys(recipient).forEach((key) => {
                const placeholder = new RegExp(`{${key}}`, 'g');
                personalizedBody = personalizedBody.replace(placeholder, String(recipient[key] || ''));
                personalizedSubject = personalizedSubject.replace(placeholder, String(recipient[key] || ''));
            });

            try {
                await this.mailerService.sendMail({
                    to: recipient.email || recipient.Email,
                    subject: personalizedSubject,
                    html: personalizedBody,
                    attachments: mailAttachments,
                });
                results.push({ email: recipient.email || recipient.Email, status: 'sent' });
            } catch (error) {
                results.push({ email: recipient.email || recipient.Email, status: 'failed', error: error.message });
            }
        }

        return results;
    }
}
