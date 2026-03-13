
import { body, param } from 'express-validator';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';


export const adminAuthValidationRules = (): any[] => {
    return [
        body("email")
            .exists()
            .withMessage(ErrorMessages.VALIDATION.KEY_MISSING("email"))
            .bail()
            .not()
            .isEmpty()
            .withMessage(
                ErrorMessages.VALIDATION.EMPTY_VALUE("email")
            )
            .bail()
            .isString()
            .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING("email"))
            .bail().custom((value) => validateEmail(value))
            .withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

        body('role')
            .exists()
            .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('role'))
            .bail()
            .custom((value: any) => validateRoles(value))
            .withMessage(ErrorMessages.AUTH.INVALID_ROLE),

        body('name')
            .exists()
            .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('name'))
            .bail()
            .not()
            .isEmpty()
            .withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('name'))
            .bail()
            .isString()
            .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('name'))
            .bail()
            .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
            .withMessage(
                ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)
            ),
    ];
};


export const validateRoles = (role: string) => {
    return Object.values(constant.ROLES).includes(role as any);
};
function validateEmail(email: string) {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
}

export const resendInviteValidationRules = (): any[] => {
    return [
        param('userId')
            .exists()
            .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('userId'))
            .bail()
            .isInt({ min: 1 })
            .withMessage('userId must be a positive integer')
            .toInt(),
    ];
};
