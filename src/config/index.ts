// UserRoleType import removed — email templates now accept plain strings
import dotenv from "dotenv";
import { emailTemplates } from "../common/templates/email.template";

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
  SOFTWARE_NAME: "NJA CRM",



  ...emailTemplates













};
