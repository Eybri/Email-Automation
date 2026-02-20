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
                // Escape key for RegExp in case it contains special characters
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const placeholder = new RegExp(`{${escapedKey}}`, 'g');

                // Use ?? to allow numeric 0 as a valid value
                const value = String(recipient[key] ?? '');

                personalizedBody = personalizedBody.replace(placeholder, value);
                personalizedSubject = personalizedSubject.replace(placeholder, value);
            });

            try {
                // Find the email address in the recipient object
                const emailAddress = recipient.email || recipient.Email || (() => {
                    const emailKey = Object.keys(recipient).find(key => {
                        const val = String(recipient[key] || '').trim();
                        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                    });
                    if (emailKey) return recipient[emailKey];

                    // Fallback: look for any key that looks like an email or contains an email
                    const fallbackKey = Object.keys(recipient).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('mail'));
                    return fallbackKey ? recipient[fallbackKey] : null;
                })();

                if (!emailAddress) {
                    throw new Error('No valid email address found for this recipient');
                }

                await this.mailerService.sendMail({
                    to: emailAddress,
                    subject: personalizedSubject,
                    html: personalizedBody,
                    attachments: mailAttachments,
                });
                results.push({ email: emailAddress, status: 'sent' });
            } catch (error) {
                const failedEmail = recipient.email || recipient.Email || 'Unknown';
                results.push({ email: failedEmail, status: 'failed', error: error.message });
            }
        }

        return results;
    }
}
