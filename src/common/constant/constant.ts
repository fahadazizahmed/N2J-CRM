const constant = {
  JWT_TOKEN_TYPE: {
    INVITE: 'invite',
    ACCESS: 'access',
    REFRESH: 'refresh',
    FORGOT: 'forgot',
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  // ACCESS_TOKEN_COOKIES_EXPIRY: 15 * 60 * 1000,//15 min
  // REFRESH_TOKEN_COOKIES_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days

  ACCESS_TOKEN_COOKIES_EXPIRY: 1 * 60 * 1000,//15 min
  REFRESH_TOKEN_COOKIES_EXPIRY: 40 * 60 * 1000, // 30 days

  CRM_NAME: "N2J CRM",
  AUDIT_LOG_ACTION: {
    INVITE_SENT: 'INVITE_SENT',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    ROLE_ADDED: 'ROLE_ADDED'
  },
  ENTITY_TYPE: {
    USER: 'User',
    JOB: 'Job',
    INVOICE: 'Invoice',
    VEHICLE: 'Vehicle',
    EMAIL: 'Email'
  },
  ROLES: {
    ADMIN: 'admin',
    CLIENT: 'client',
    SUBCONTRACTOR: 'subcontractor',
    DRIVER: 'driver',
  } as const
};
export default constant;
