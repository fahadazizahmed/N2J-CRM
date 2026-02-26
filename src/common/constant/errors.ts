const ErrorMessages = {
  VALIDATION: {
    MAX_LENGTH_ERROR: (key: string, character: number) =>
      `${key} must be lesser than ${character} characters`,
    VALUE_MUST_BE_STRING: (value: string) => `The ${value} must be string`,
    EMPTY_VALUE: (value: string) => `${value} cannot be empty`,
    SPACE_ERROR: (value: string) => `No spaces are allowed in the ${value}`,
    INVALID_DATA_TYPE: (value?: string, expectedType?: string) =>
      `${value} value must be of type ${expectedType}`,
    KEY_MISSING: (key: string) => `${key} key is missing`,
  },
  //AUT_MODULE_ERROR
  //PROFILE_MODILE_ERRO
  //Module Error

  AUTH: {
    INVALID_ROLE: 'Invalid user role type',
    USERNAME_LENGTH_MAX: (min: number, max: number) =>
      `username must be greater than ${min} character and less than ${max + 1} characters.`,
    NAME_LENGTH_MAX: (min: number, max: number) =>
      `Full name must be greater than ${min} character and less than ${max} characters.`,
    INVALID_EMAIL: 'Email must be valid.',
    INVALID_PASSWORD: (value: any) => `Please choose a more secure password. ${value} must be greater than 8 characters long and contain at least one lowercase letter, one uppercase letter, one numeric digit`,
    ROLE_NOT_FOUND: 'Role not found',
    USER_EXISTS_WITH_ROLE: 'User already exists with this role',
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or Expired token',
    USER_NOT_FOUND: 'User not found',
    TOKEN_EXPIRED_OR_USED: 'Token has explicitly been expired or used',
    INVALID_CREDENTIALS: 'Invalid credentials',
    ACCOUNT_INACTIVE: 'Your account is inactive. Please contact admin.',
    NO_ACCESS_TO_LOGIN_AS: (role: string) => `You don't have access to login as ${role}`,
    SESSION_NOT_FOUND: 'Session not found or already logged out',
  },


  CLIENT: {
    INVALID_GST_STATUS: 'Invalid GST status',
    INVALID_CREDIT_TERMS: 'Invalid credit terms',
    INVALID_CLIENT_STATUS: 'Invalid client status',
    DUPLICATE_EMAIL: 'A user with this email already exists',
    DUPLICATE_ABN: 'A client with this ABN already exists',
    DUPLICATE_CLIENT_NAME: 'A client with this name already exists',
    CLIENT_NOT_FOUND: 'Client not found',
  },








  GENERIC: {
    OPERATION_FAILED: (operation: string) => `Operation: ${operation} failed.`,
  },
};

export default ErrorMessages;
