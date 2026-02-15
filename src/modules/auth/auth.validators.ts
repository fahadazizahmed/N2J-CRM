import { body } from 'express-validator';
import constant from '../../constant/constant';
import ErrorMessages from '../../constant/errors';
import { UserRoles } from './auth.dto';

/**
 * Admin Login validation
 */
export const loginValidationRules = () => {
  return [
    body('email')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('email'))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('email'))
      .bail()
      .isEmail()
      .withMessage('Invalid email format')
      .bail()
      .normalizeEmail({ all_lowercase: true }), // Auto-lowercase email

    body('password')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('password'))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('password'))
      .bail()
      .isString()
      .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('password')),

    body('role')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('role'))
      .bail()
      .custom((value: any) => validateRoles(value))
      .withMessage(ErrorMessages.AUTH.INVALID_ROLE),
  ];
};

export const validateRoles = (role: String) => {
  return UserRoles.find((x: string) => x === role) ? true : false;
};
