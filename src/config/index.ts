import constant from "../common/constant/constant";
import { UserRoleType } from "../common/types/role.types";

// Set the NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const envFound = require('dotenv').config({ path: `${process.env.NODE_ENV}` });

if (envFound.error) {
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  port: process.env.PORT || 300,
  api: {
    prefix: '/api/v1',
  },
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,

  REGISTER_USER_EMAIL: {
    content: (inviteLink: any, role: UserRoleType) => {
      return `
                <h3>Welcome to N2J CRM</h3>
                <p>You have been invited to join as a <b>${role}</b>.</p>
                <p>Please click the link below to set up your account:</p>
                <a href="${inviteLink}">${inviteLink}</a>
            `;
    },
    subject: "Invitation to N2J CRM"
  }













};
