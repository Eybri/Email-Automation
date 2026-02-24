import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) { }

    async sendBulkEmails(
        template: string,
        subject: string,
        recipients: any[],
        attachments: Express.Multer.File[] = [],
        googleAccessToken?: string,
        userEmail?: string,
    ) {
        const results: any[] = [];
        let transporter: any = null;

        if (googleAccessToken && userEmail) {
            console.log(`DEBUG: Initializing OAuth2 SMTP for user: ${userEmail}`);
            console.log(`DEBUG: Access Token (start): ${googleAccessToken.substring(0, 10)}...`);

            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                debug: true,
                logger: true,
                auth: {
                    type: 'OAuth2',
                    user: userEmail,
                    accessToken: googleAccessToken,
                },
            });
        } else {
            console.log('DEBUG: Falling back to default SMTP transporter');
        }

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
                // Use case-insensitive 'gi' and allow spaces inside curly braces: {\s*key\s*}
                const placeholder = new RegExp(`{\\s*${escapedKey}\\s*}`, 'gi');

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

                if (transporter) {
                    await transporter.sendMail({
                        from: userEmail,
                        to: emailAddress,
                        subject: personalizedSubject,
                        html: personalizedBody,
                        attachments: mailAttachments,
                    });
                } else {
                    await this.mailerService.sendMail({
                        to: emailAddress,
                        subject: personalizedSubject,
                        html: personalizedBody,
                        attachments: mailAttachments,
                    });
                }
                results.push({ email: emailAddress, status: 'sent', remarks: 'Email sent successfully' });
            } catch (error) {
                const failedEmail = recipient.email || recipient.Email || recipient.Email_Address || recipient.Mail || 'Unknown';
                let remarks = error.message;
                if (remarks.includes('No valid email address found')) {
                    remarks = 'Email address not found';
                }
                results.push({ email: failedEmail, status: 'failed', remarks });
            }
        }

        return results;
    }
}
