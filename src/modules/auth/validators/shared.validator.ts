import { body } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { UserRoles } from '../../../common/types/role.types';

export const sharedAuthValidationRules = () => {
  return [
    body("password")
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING("password"))
      .bail()
      .not()
      .isEmpty()
      .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE("password"))
      .bail()
      .isString()
      .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING("password"))
      .bail().custom((value) => validatePassword(value))
      .withMessage(ErrorMessages.AUTH.INVALID_PASSWORD("Password")),

    body('token')
      .notEmpty()
      .withMessage('Token is required'),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
  ];
};

export const sharedLoginValidationRules = () => {
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
      .withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

    body('role')
      .exists()
      .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('role'))
      .bail()
      .custom((value) => UserRoles.includes(value))
      .withMessage(ErrorMessages.AUTH.INVALID_ROLE),

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
  ];
};

function validatePassword(password: any) {
  //const re = /^(?!.*[_\s-]{2,})[a-zA-Z0-9][a-zA-Z0-9_\-]*[a-zA-Z0-9]$/
  const re = /^(?=.*\d)(?=.*[A-Z]).{9,}$/;
  return re.test(String(password));
}