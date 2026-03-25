import { body, param, ValidationChain, query } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import constant from '../../../common/constant/constant';
import { isValidABN, isValidPhone } from '../../../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';
import { GstStatus, CreditTerms, ClientStatus } from '../../../../generated/prisma';

// ─── Create ───────────────────────────────────────────────────────────────────
// user_id is NOT in body — it comes from the JWT token automatically
export const createClientValidationRules = (): ValidationChain[] => [

    body('clientName')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('clientName')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('clientName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('clientName'))
        .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
        .withMessage(
            ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)
        ),

    body('abn')
        .optional()
        .isString()
        .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('ABN'))
        .bail()
        .custom(value => {
            if (!isValidABN(value)) {
                throw new Error('Invalid ABN');
            }
            return true;
        }),
    body('address')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('address')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('address')),


    body('phone')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('phone')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
        .bail()
        .custom((value, { req }) => {
            const country = req.body.countryCode as CountryCode;

            if (!country) {
                throw new Error('countryCode is required when phone is provided');
            }

            if (!isValidPhone(value, country)) {
                throw new Error(`Invalid phone number for country ${country}`);
            }
            return true;
        }),

    body('countryCode')
        .optional()
        .isString()
        .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('countryCode')),


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

    body('gstStatus')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('gstStatus'))
        .bail()
        .custom((value) => Object.values(GstStatus).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_GST_STATUS),

    body('creditTerms')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('creditTerms'))
        .bail()
        .custom((value) => Object.values(CreditTerms).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CREDIT_TERMS),


    body('creditScore')
        .optional()
        .isInt({ min: constant.CREDIT_SCORE.MIN, max: constant.CREDIT_SCORE.MAX })
        .withMessage(`Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`),

    body('status')
        .exists()
        .withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status'))
        .bail()
        .custom((value) => Object.values(ClientStatus).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
];

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateClientValidationRules = (): ValidationChain[] => [

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

    body('gstStatus')
        .optional()
        .custom((value) => Object.values(GstStatus).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_GST_STATUS),

    body('creditTerms')
        .optional()
        .custom((value) => Object.values(CreditTerms).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CREDIT_TERMS),

    body('creditScore')
        .optional()
        .isInt({ min: constant.CREDIT_SCORE.MIN, max: constant.CREDIT_SCORE.MAX })
        .withMessage(`Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`)
        .toInt(),

    body('status')
        .optional()
        .custom((value) => Object.values(ClientStatus).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),

    body().custom(body => {
        if (Object.keys(body).length === 0) {
            throw new Error('At least one field must be provided for update');
        }
        return true;
    }),

];

// ─── Delete & Get By ID ────────────────────────────────────────────────────────
export const deleteClientValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Client id")).toInt(),
];


// ─── Get (paginated) ──────────────────────────────────────────────────────────

export const getClientsValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage(ErrorMessages.PAGINATION.PAGE_MUST_BE_POSITIVE_NUMBER).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.PAGINATION.LIMIT_MUST_BETWEEN_1_AND_100).toInt(),
    query('status').optional().custom((value) => Object.values(ClientStatus).includes(value)).withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
    query('search').optional().isString().trim(),
];


export const IdValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Client id")).toInt(),
];

