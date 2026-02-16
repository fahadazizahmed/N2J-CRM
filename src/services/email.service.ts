import nodemailer from 'nodemailer';
console.log("fina", `"N2J CRM" <${process.env.EMAIL_SENDER}>`)

export class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    public async sendEmail(to: string, subject: string, html: string): Promise<any> {
        try {
            console.log("EMAIL_HOST", process.env.EMAIL_HOST, "port", Number(process.env.EMAIL_PORT), "user", process.env.EMAIL_USER, "pasword", process.env.EMAIL_PASS, "to", to, "subject", subject, "html", html, "sender", `"N2J CRM" <${process.env.EMAIL_SENDER}>`)


            const info = await this.transporter.sendMail({
                from: `"N2J CRM" <${process.env.EMAIL_SENDER}>`, // sender address
                to, // list of receivers
                subject, // Subject line
                html, // html body
            });
            console.log("Message sent: %s", info.messageId);
            return info;
        } catch (error) {
            console.error("Error sending email: ", error);
            // We might not want to throw here to avoid breaking the main flow if email fails
            // throw error; 
        }
    }
}

export const emailService = new EmailService();
