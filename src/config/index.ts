import constant from "../common/constant/constant";
// UserRoleType import removed — email templates now accept plain strings
import dotenv from "dotenv";

// 🔹 Default to "development"
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// 🔹 Map NODE_ENV to your env filenames
const envFileMap: Record<string, string> = {
  development: "develop.env",
  production: "production.env",
};

// 🔹 Get the env file path based on NODE_ENV
const envFilePath = envFileMap[process.env.NODE_ENV] || "develop.env";

// 🔹 Load the environment variables from the file
const envFound = dotenv.config({ path: envFilePath });


if (envFound.error) {
  console.warn(`⚠️  No ${envFilePath} file found. Using process.env variables.`);
} else {
  console.log(`✅ Loaded environment variables from ${envFilePath}`);
}





if (envFound.error) {
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  port: process.env.PORT || 300,
  api: {
    prefix: '/api/v1',
  },
  JWT_ACCESS_TOKEN_SECRET_KEY: process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
  JWT_REFRESH_TOKEN_SECRET_KEY: process.env.JWT_REFRESH_TOKEN_SECRET_KEY,




  REGISTER_USER_EMAIL: {
    content: (inviteLink: any, role: string) => {
      return `
                <h3>Welcome to N2J CRM</h3>
                <p>You have been invited to join as a <b>${role}</b>.</p>
                <p>Please click the link below to set up your account:</p>
                <a href="${inviteLink}">${inviteLink}</a>
            `;
    },
    subject: "Invitation to N2J CRM"
  },
  ROLE_ADDED_EMAIL: {
    content: (role: string) => {
      return `
                <h3>Role Update - N2J CRM</h3>
                <p>A new role <b>${role}</b> has been assigned to your account.</p>
                <p>You can now access the features associated with this role using your existing credentials.</p>
            `;
    },
    subject: "Role Assigned - N2J CRM"
  },
  FORGOT_PASSWORD_EMAIL: {
    content: (resetLink: string) => {
      return `
                <h3>Password Reset - N2J CRM</h3>
                <p>You have requested to reset your password.</p>
                <p>Please click the link below to set a new password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>If you did not request this, please ignore this email.</p>
            `;
    },
    subject: "Password Reset Request - N2J CRM"
  }













};
