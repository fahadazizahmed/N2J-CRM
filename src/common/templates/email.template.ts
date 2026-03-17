const SOFTWARE_NAME = process.env.SOFTWARE_NAME || "NJA CRM";

export const emailTemplates: any = {
  REGISTER_USER_EMAIL: {
    content: (inviteLink: any, role: string) => {
      return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1a365d;">
            <h2 style="color: #1a365d; margin: 0; font-size: 24px;">Welcome to ${SOFTWARE_NAME}</h2>
          </div>
          <div style="padding: 30px 0; line-height: 1.6; font-size: 16px;">
            <p>Hello,</p>
            <p>You have been exclusively invited to join the <strong>${SOFTWARE_NAME}</strong> platform as a <strong>${role}</strong>.</p>
            <p>Our platform is designed to streamline operations and provide you with the best tools to manage your work effectively.</p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${inviteLink}" style="background-color: #1a365d; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Up Your Account</a>
            </div>
            <p style="font-size: 14px; color: #666;">If the button above does not work, please copy and paste the following link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all; color: #1a365d;"><a href="${inviteLink}" style="color: #1a365d;">${inviteLink}</a></p>
          </div>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} <a href="https://www.njashton.com.au/" style="color: #1a365d; text-decoration: none;">NJ Ashton</a>. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `;
    },
    subject: `Invitation to ${SOFTWARE_NAME}`
  },
  ROLE_ADDED_EMAIL: {
    content: (role: string) => {
      return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1a365d;">
            <h2 style="color: #1a365d; margin: 0; font-size: 24px;">Role Update - ${SOFTWARE_NAME}</h2>
          </div>
          <div style="padding: 30px 0; line-height: 1.6; font-size: 16px;">
            <p>Hello,</p>
            <p>We are writing to inform you that your access on the <strong>${SOFTWARE_NAME}</strong> platform has been updated.</p>
            <p>A new role, <strong>${role}</strong>, has now been assigned to your account.</p>
            <p>You can access the new features and capabilities associated with this role using your existing credentials. No further action is required on your part.</p>
          </div>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} <a href="https://www.njashton.com.au/" style="color: #1a365d; text-decoration: none;">NJ Ashton</a>. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `;
    },
    subject: `Role Assigned - ${SOFTWARE_NAME}`
  },
  FORGOT_PASSWORD_EMAIL: {
    content: (resetLink: string) => {
      return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1a365d;">
            <h2 style="color: #1a365d; margin: 0; font-size: 24px;">Password Reset - ${SOFTWARE_NAME}</h2>
          </div>
          <div style="padding: 30px 0; line-height: 1.6; font-size: 16px;">
            <p>Hello,</p>
            <p>We received a request to reset the password associated with your account on the <strong>${SOFTWARE_NAME}</strong> platform.</p>
            <p>If you made this request, please click the button below to securely set a new password:</p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetLink}" style="background-color: #1a365d; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666;">If the button above does not work, please copy and paste the following link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all; color: #1a365d;"><a href="${resetLink}" style="color: #1a365d;">${resetLink}</a></p>
            <p style="margin-top: 30px; font-size: 14px; color: #888;">If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #888;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} <a href="https://www.njashton.com.au/" style="color: #1a365d; text-decoration: none;">NJ Ashton</a>. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `;
    },
    subject: `Password Reset Request - ${SOFTWARE_NAME}`
  }
};
