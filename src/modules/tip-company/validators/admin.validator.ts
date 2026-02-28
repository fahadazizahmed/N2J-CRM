import { body, param, ValidationChain, query } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import constant from '../../../common/constant/constant';
import { isValidABN, isValidPhone } from '../../../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';
import { TipStatus } from '../../../common/types/tip-company.types';

// ─── Create ───────────────────────────────────────────────────────────────────
export const createTipCompanyValidationRules = (): ValidationChain[] => [

    body('tipName')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('tipName')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('tipName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('tipName'))
        .isLength({ min: constant.NAME.MIN_LENGTH, max: constant.NAME.MAX_LENGTH })
        .withMessage(ErrorMessages.AUTH.NAME_LENGTH_MAX(constant.NAME.MIN_LENGTH, constant.NAME.MAX_LENGTH)),

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
            console.log("coutnry", country)

            if (!country) {
                throw new Error('Country code is required');
            }

            if (!isValidPhone(value, country)) {
                throw new Error(`Invalid phone number for country ${country}`);
            }
            return true;
        }),

    body('status')
        .custom((value) => TipStatus.includes(value))
        .withMessage(ErrorMessages.TIP_COMPANY.INVALID_STATUS),

];

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateTipCompanyValidationRules = (): ValidationChain[] => [

    param('id')
        .isInt({ min: 1 }).withMessage('Tip company id must be a positive integer')
        .toInt(),

    body('tipName')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('tipName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('tipName'))
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

    body('status')
        .optional()
        .custom((value) => TipStatus.includes(value))
        .withMessage(ErrorMessages.TIP_COMPANY.INVALID_STATUS),
];

// ─── Get By ID ────────────────────────────────────────────────────────────────
export const getTipCompanyByIdValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage('Tip company id must be a positive integer').toInt(),
];

// ─── Get (paginated) ──────────────────────────────────────────────────────────
export const getTipCompaniesValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
    query('status').optional().custom((value) => TipStatus.includes(value)).withMessage(ErrorMessages.TIP_COMPANY.INVALID_STATUS),
    query('search').optional().isString().trim(),
];
