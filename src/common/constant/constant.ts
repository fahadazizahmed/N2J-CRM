const constant = {
  JWT_TOKEN_TYPE: {
    INVITE: 'invite',
    ACCESS: 'access',
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  CRM_NAME: "N2J CRM",
  AUDIT_LOG_ACTION: {
    INVITE_SENT: 'INVITE_SENT',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN'
  },
  ENTITY_TYPE: {
    USER: 'User',
    JOB: 'Job',
    INVOICE: 'Invoice',
    VEHICLE: 'Vehicle'
  }

};
export default constant;
