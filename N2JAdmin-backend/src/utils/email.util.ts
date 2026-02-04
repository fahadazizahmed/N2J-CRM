import nodemailer from 'nodemailer';

/**
 * Email service using Nodemailer with Mailtrap for testing
 */

// Create transporter using Mailtrap SMTP
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.MAILTRAP_PORT || '2525'),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

/**
 * Send credentials email to newly created user
 * @param email - User's email address
 * @param password - User's password (plain text)
 * @param role - User's role
 */
export async function sendCredentialsEmail(
  email: string,
  password: string,
  role: string
): Promise<void> {
  try {
    const displayName = email.split('@')[0]; // Use email username as display name

    const mailOptions = {
      from: process.env.MAILTRAP_FROM || 'noreply@n2jcrm.com',
      to: email,
      subject: 'Welcome to N2J CRM - Your Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
            .credentials { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { color: #d32f2f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to N2J CRM</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${displayName}</strong>,</p>
              <p>Your account has been successfully created with the role of <strong>${role}</strong>.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              
              <p class="warning">⚠️ Important: Please change your password after your first login.</p>
              
              <p>Best regards,<br>N2J CRM Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to N2J CRM
        
        Hello ${displayName},
        
        Your account has been successfully created with the role of ${role}.
        
        Login Credentials:
        Email: ${email}
        Password: ${password}
        
        Please change your password after your first login.
        
        Best regards,
        N2J CRM Team
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Credentials email sent successfully to ${email}`);
  } catch (error) {
    console.error('❌ Error sending credentials email:', error);
    // Don't throw - we don't want to fail user creation if email fails
  }
}
