

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
  CREDIT_SCORE: {
    MIN: 0,
    MAX: 100,
    THRESHOLD: 50, // Minimum credit score required to activate a contract
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
    CLIENT: 'Client',
    TIP_COMPANY: 'TipCompany',
    JOB: 'Job',
    INVOICE: 'Invoice',
    VEHICLE: 'Vehicle',
    EMAIL: 'Email',
    CONTRACT: 'Contract',
    CONTRCT_RATE: "ContractRate",
    DRIVER: 'Drvier'
  },
  ROLES: {
    ADMIN: 'admin',
    CLIENT: 'client',
    SUBCONTRACTOR: 'subcontractor',
    DRIVER: 'driver',
  } as const,
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  CODE_PREFIX: {
    CLIENT: 'NJA-CL',
    TIP_COMPANY: 'NJA-TC',
    JOB: 'NJA-JB',
    INVOICE: 'NJA-INV',
    VEHICLE: 'NJA-VH',
    EMAIL: 'NJA-EM',
    CONTRACT: 'NJA-CT'
  },
  MEDIA_PATHS: {
    DRIVER_DOC: (driverId: number | string, documentType: string, filename: string) => `fleet/driver/${driverId}/docs/${documentType}/${filename}`,
    VEHICLE_MEDIA: (registrationNumber: string, documentType: string, filename: string) => `fleet/vehicle/${registrationNumber}/docs/${documentType}/${filename}`,
    CONTRACT_MEDIA: (contractNumber: string,filename: string) => `contract/${contractNumber}/docs/${filename}`
  },
  TX_MAX_WAIT: 10000,
  TX_TIMEOUT: 20000
};
export default constant;
