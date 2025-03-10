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
    INVALID_ROLE: 'Invalid role can be USER | SUPER_ADMIN | ADMIN',
    USERNAME_LENGTH_MAX: (min: number, max: number) =>
      `username must be greater than ${min} character and less than ${max + 1} characters.`,
    NAME_LENGTH_MAX: (min: number, max: number) =>
      `Full name must be greater than ${min} character and less than ${max} characters.`,
    INVALID_EMAIL: { errorMsg: 'Email must be valid.' },
  },
  GENERIC: {
    OPERATION_FAILED: (operation: string) => `Operation: ${operation} failed.`,
  },
};

export default ErrorMessages;
