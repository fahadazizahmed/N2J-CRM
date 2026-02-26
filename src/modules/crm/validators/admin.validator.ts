import { body, param, ValidationChain, query } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import constant from '../../../common/constant/constant';
import { isValidABN, isValidPhone } from '../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';
import { GSTStatus, CreditTerms, ClientStatus } from '../../../common/types/client.types';




// ─── Create ───────────────────────────────────────────────────────────────────
// user_id is NOT in body — it comes from the JWT token automatically
export const createClientValidationRules = (): ValidationChain[] => [


    body('clientName')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('companyName')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('companyName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('companyName'))
        .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
        .withMessage(
            ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)
        ),

    body('abn')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('ABN')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('ABN')).bail()
        .bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('ABN'))
        .bail()
        .custom((value) => {
            if (!isValidABN(value)) {
                throw new Error('Invalid ABN');
            }
            return true;
        }),

    body('address')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('address')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('address')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('address')),



    body('phone')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('phone')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('phone')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
        .bail()
        .custom((value, { req }) => {
            const country = req.body.countryCode as CountryCode;
            if (!country) {
                throw new Error('Country code is required');
            }

            if (!isValidPhone(value, country)) {
                throw new Error(`Invalid phone number for country ${country}`);
            }
            return true;
        }),

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

    body('gtsStatus')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('gtsStatus'))
        .bail()
        .custom((value) => GSTStatus.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_GST_STATUS),

    body('creditTerms')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('creditTerms'))
        .bail()
        .custom((value) => CreditTerms.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CREDIT_TERMS),


    body('creditScore')
        .optional()
        .isInt({ min: constant.CREDIT_SCORE.MIN, max: constant.CREDIT_SCORE.MAX })
        .withMessage(`Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`),

    body('status')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status'))
        .bail()
        .custom((value) => ClientStatus.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),

];

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateClientValidationRules = (): ValidationChain[] => [

    param('id')
        .isInt({ min: 1 }).withMessage('Client id must be a positive integer')
        .toInt(),

    body('clientName')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('clientName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('clientName'))
        .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
        .withMessage(ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)),

    body('abn')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('ABN')).bail()
        .custom((value) => {
            if (!isValidABN(value)) throw new Error('Invalid ABN');
            return true;
        }),

    body('address')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('address')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('address')),

    body('phone')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('phone')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone')).bail()
        .custom((value, { req }) => {
            const country = req.body.countryCode as CountryCode;
            if (!country) throw new Error('countryCode is required when updating phone');
            if (!isValidPhone(value, country)) throw new Error(`Invalid phone number for country ${country}`);
            return true;
        }),

    body('countryCode')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('countryCode')),

    body('gtsStatus')
        .optional()
        .custom((value) => GSTStatus.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_GST_STATUS),

    body('creditTerms')
        .optional()
        .custom((value) => CreditTerms.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CREDIT_TERMS),

    body('creditScore')
        .optional()
        .isInt({ min: constant.CREDIT_SCORE.MIN, max: constant.CREDIT_SCORE.MAX })
        .withMessage(`Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`)
        .toInt(),

    body('status')
        .optional()
        .custom((value) => ClientStatus.includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),

];

// ─── Delete & Get By ID ────────────────────────────────────────────────────────
export const deleteClientValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage('Client id must be a positive integer').toInt(),
];

export const getClientByIdValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage('Client id must be a positive integer').toInt(),
];

// ─── Get (paginated) ──────────────────────────────────────────────────────────

export const getClientsValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
    query('status').optional().custom((value) => ClientStatus.includes(value)).withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
    query('search').optional().isString().trim(),
];

function validateEmail(email: string) {
    const re =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
}