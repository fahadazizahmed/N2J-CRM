import { body } from 'express-validator';
import constant from '../../constant/constant';
import ErrorMessages from '../../constant/errors';
import { UserRoles } from './auth.dto';

// User signup validation
export const signupValidationRules = () => {
  return [
    body('password')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('password'))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('password'))
      .bail()
      .isString()
      .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('password'))
      .bail(),

    body('role')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('role'))
      .bail()
      .custom((value: any) => validateRoles(value))
      .withMessage(ErrorMessages.AUTH.INVALID_ROLE),

    body('fullName')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('fullName'))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('fullName'))
      .bail()
      .isString()
      .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('Fullname'))
      .bail()
      .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
      .withMessage(
        ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)
      ),

    body('username')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('username'))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('username'))
      .bail()
      .isString()
      .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('username'))
      .bail()
      .custom((value) => validateUsername(value))
      .withMessage(ErrorMessages.VALIDATION.SPACE_ERROR('username'))
      .bail()
      .isLength({ min: constant.USERNAME.MIN_LENGTH, max: constant.USERNAME.MAX_LENGTH })
      .withMessage(
        ErrorMessages.AUTH.USERNAME_LENGTH_MAX(
          constant.USERNAME.MIN_LENGTH,
          constant.USERNAME.MAX_LENGTH
        )
      ),
  ];
};

function validateUsername(username: any) {
  const re = /^(?!.*[_\s-]{2,})[a-zA-Z0-9][a-zA-Z0-9_\-]*[a-zA-Z0-9]$/;
  return re.test(String(username));
}
export const validateRoles = (role: String) => {
  return UserRoles.find((x: string) => x === role) ? true : false;
};
