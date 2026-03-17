import nodemailer from 'nodemailer';
import { failedOperationService } from './failed-operation.service';
import { OperationType } from '../common/types/failed-operation.types';

export class EmailService {
    private transporter;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // prevents TLS issues in some environments
            }
        });
    }

    /**
     * Utility function to delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Sends email with retry logic and exponential backoff
     * @returns {success: boolean, info?: any, error?: any}
     */
    public async sendEmailWithRetry(
        to: string,
        subject: string,
        html: string,
        entityType?: string,
        entityId?: number
    ): Promise<{ success: boolean; info?: any; error?: any }> {
        let lastError: any;

        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {

                const info = await this.transporter.sendMail({
                    from: `"I2N CRM" <${process.env.EMAIL_SENDER}>`,
                    to,
                    subject,
                    html,
                });


                return { success: true, info };

            } catch (error: any) {
                lastError = error;
                const isLastAttempt = attempt === this.MAX_RETRIES - 1;
                // Don't delay after the last attempt
                if (!isLastAttempt) {
                    await this.delay(this.RETRY_DELAYS[attempt]);
                }
            }
        }

        // Store failed operation in database for later retry
        await failedOperationService.logFailure({
            operation_type: OperationType.EMAIL,
            entity_type: entityType || 'Email', // Use provided entity type or default to Email
            entity_id: entityId,
            payload: {
                to,
                subject,
                html,
                from: `"N2J CRM" <${process.env.EMAIL_SENDER}>`
            },
            error_message: lastError?.message || String(lastError)
        });

        return { success: false, error: lastError };
    }

    /**
     * Original sendEmail method (kept for backward compatibility)
     * @deprecated Use sendEmailWithRetry for better reliability
     */
    public async sendEmail(to: string, subject: string, html: string): Promise<any> {
        try {
            const info = await this.transporter.sendMail({
                from: `"N2J CRM" <${process.env.EMAIL_SENDER}>`,
                to,
                subject,
                html,
            });
            return info;
        } catch (error) {
            throw error;
        }
    }
}

export const emailService = new EmailService();
