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
    INVALID_ID: (key: string) => `${key} must be a valid positive integer`,
    REQURED_FILED_MISSING: (key: string) => `${key} is required`,
    VALUE_MUST_BE_INT: (value: string) => `The ${value} must be positive integer`,
    VALUE_MUST_BE_NUMERIC: (value: string) => `The ${value} must be a number`,
    INVALID_EMAIL_FORMAT: 'Invalid email format',

  },

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
    DUPLICATE_ABN: 'A client with this ABN already exists',
    DUPLICATE_CLIENT_NAME: 'A client with this name already exists',
    CLIENT_NOT_FOUND: 'Client not found',
    CLIENT_NOT_ACTIVE: 'Client is not active. Contracts can only be created for active clients',
    CLIENT_GST_NOT_APPROVED: 'Client GST is not approved. Contract status cannot be updated',
    CLIENT_CREDIT_SCORE_BELOW_THRESHOLD: (score: number, threshold: number) =>
      `Client credit score (${score}) is below the required threshold (${threshold}). Contract status cannot be updated`,
  },

  TIP_COMPANY: {
    INVALID_STATUS: 'Invalid tip company status',
    DUPLICATE_ABN: 'A tip company with this ABN already exists',
    DUPLICATE_NAME: 'A tip company with this name already exists',
    NOT_FOUND: 'Tip company not found',
  },
  CONTRACT: {
    NOT_FOUND: 'Contract not found',
    DUPLICATE_CONTRACT_NUMBER: 'A contract with this number already exists',
    INVALID_DATES: 'start_date must be before end_date',
    INVALID_CONTRACT_MANAGER: 'The specified contract manager must be an admin',
    CONTRACT_MANAGER_NOT_ACTIVE: "Contract manager is no more active",
    INVALID_DATE: (date: string) => `${date} must be a valid ISO8601 date`,
    INVALID_CONTRACT_STATUS: 'Invalid contract status',
    DRAFT_ONLY_FIELDS: 'startDate, endDate, creditTermsOverride and specialTerms can only be edited on draft contracts',
  },
  CONTRACT_RATE: {
    RATE_NOT_FOUND: 'Contract rate not found',
    NO_RATES: 'Contract must have at least one rate before it can be activated',
    EFFECTIVE_FROM_BEFORE_CONTRACT_START: 'effectiveFrom cannot be before the contract start date',
    EFFECTIVE_FROM_AFTER_CONTRACT_END: 'effectiveFrom cannot be after the contract end date',
    OVERLAP: 'The new rate period overlaps with an existing rate period',
    NO_ACTIVE_RATE_ON_DATE: (date: string) => `No active rate found covering date ${date}`,
    RATE_CHANGE_NOT_ALLOWED_ON_DRAFT: 'Use POST /rates to add rates on a draft contract. Rate change (versioning) is only for active contracts',
    DRAFT_NOT_EDITABLE_AFTER_ACTIVATE: 'This rate period cannot be added — contract is already active. Use the rate-change endpoint to add a new versioned rate',
    CANNOT_DELETE_ACTIVE_RATE: 'Cannot delete a rate that is currently active. Close it first by adding a new rate',
    EFFECTIVE_FROM_MUST_BE_FUTURE: 'effectiveFrom must be in the future or today for an active contract',
    NO_ACTIVE_RATE_ON_CONTRACT_START: 'No active rate found on contract start date',
    DATE_MUST_GIVEN: 'Please specify the contract start and end dates in the Details tab before adding a rate.',
    START_DATE_MUST_GIVEN: 'Please specify the contract start date before it can be activated.'

  },
  PAGINATION: {

    PAGE_MUST_BE_POSITIVE_NUMBER: "page must be a positive integer",
    LIMIT_MUST_BETWEEN_1_AND_100: "limit must be between 1 and 100"
  },

  GENERIC: {
    OPERATION_FAILED: (operation: string) => `Operation: ${operation} failed.`,
    ITEM_NOT_FOUND: (key: string) => `${key} not found.`,
    DUPLICATE_EMAIL: 'A user with this email already exists',
  },
  FLEET: {
    VEHICLE_ALREADY_EXIST: 'Vehicle with this registration number already exists',
    INVALID_VEHICLE_STATUS: 'Invalid vehicle status',
  },
  JOB: {
    INVALID_DATES: 'entry_date must be before delivery_date',

  }
};

export default ErrorMessages;
