import { body, param, query, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { CreditTerms, ContractStatus, ContractType, ApprovalStatus, GstStatus } from '../../../../generated/prisma';
import { BillingType, TollHandling } from '../../../../generated/prisma';
import { isValidABN, isValidPhone } from '../../../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';
import constant from '../../../common/constant/constant';

export const createContractValidationRules = (): ValidationChain[] => [

    body('companyName')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('companyName')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('companyName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('companyName')),

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

    body('contractType')
        .optional()
        .default(ContractType.client)
        .custom((v) => Object.values(ContractType).includes(v))
        .withMessage(`contractType must be one of: ${Object.values(ContractType).join(', ')}`),

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
        .withMessage(
            `Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`
        ),


];

export const uploadContractDocsValidationRules = (): ValidationChain[] => [
    body('contractId')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('contractId')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('contractId'))
        .toInt(),
    body('documentName')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('documentName')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('documentName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('documentName')),
];

export const updateContractValidationRules = (): ValidationChain[] => [
    param('id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('id'))
        .toInt(),

    body('companyName')
        .optional()

        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('companyName')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('companyName')),

    body('email')
        .optional()
        .isEmail()
        .withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

    body('abn')
        .optional()
        .isString()
        .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('ABN'))
        .bail()
        .custom(value => {
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
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
        .bail()
        .custom((value, { req }) => {
            const country = req.body.countryCode as CountryCode;
            if (!country) throw new Error('countryCode is required when phone is provided');
            if (!isValidPhone(value, country)) throw new Error(`Invalid phone number for country ${country}`);
            return true;
        }),

    body('countryCode')
        .optional()
        .isString()
        .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('countryCode')),


    body('contractTitle')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contract_title')),

    body('contractType')
        .optional()
        .custom((v) => Object.values(ContractType).includes(v))
        .withMessage(`contractType must be one of: ${Object.values(ContractType).join(', ')}`),

    // body('approvalStatus')
    //     .optional()
    //     .custom((v) => Object.values(ApprovalStatus).includes(v))
    //     .withMessage(`approvalStatus must be one of: ${Object.values(ApprovalStatus).join(', ')}`),

    body('startDate')
        .optional()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("startDate")),

    body('endDate')
        .optional()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("endDate"))
        .custom((value, { req }) => {
            const startStr = req.body.startDate;
            if (startStr && value) {
                const start = new Date(startStr);
                const end = new Date(value);
                if (start >= end) {
                    throw new Error(ErrorMessages.CONTRACT.INVALID_DATES);
                }
            }
            return true;
        }),

    body('creditTermsOverride')
        .optional()
        .custom((value) => Object.values(CreditTerms).includes(value))
        .withMessage(ErrorMessages.CLIENT.INVALID_CREDIT_TERMS),

    body('specialTerms')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('specialTerms')),

    body('contractManagerId')
        .optional()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('contractManagerId'))
        .toInt(),

    body('contractContactName')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactName')),

    body('contractContactEmail')
        .optional()
        .isEmail().withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

    body('contractContactPhone')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactPhone')),

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
        .withMessage(
            `Credit score must be between ${constant.CREDIT_SCORE.MIN} and ${constant.CREDIT_SCORE.MAX}`
        ),

];

// ─── Update Contract Status ──────────────────────────────────────────────────
export const updateContractStatusValidationRules = (): ValidationChain[] => [
    param('id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('id'))
        .toInt(),

    body('status')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('status')).bail()
        .custom((value) => Object.values(ContractStatus).includes(value))
        .withMessage(ErrorMessages.CONTRACT.INVALID_CONTRACT_STATUS),
];

export const updateContractApprovalStatusValidationRules = (): ValidationChain[] => [
    param('id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('id'))
        .toInt(),

    body('status')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('status')).bail()
        .custom((value) => Object.values(ApprovalStatus).includes(value))
        .withMessage(ErrorMessages.CONTRACT.INVALID_CONTRACT_STATUS),

    body('reason')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('reason')),
];



// ─── Get Contract By ID ───────────────────────────────────────────────
export const getContractByIdValidationRules = (): ValidationChain[] => [
    param('id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('id'))
        .toInt(),
];

// ─── Get Contracts List (paginated + filter + search) ───────────────────
export const getContractsValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage(ErrorMessages.PAGINATION.PAGE_MUST_BE_POSITIVE_NUMBER).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.PAGINATION.LIMIT_MUST_BETWEEN_1_AND_100).toInt(),
    query('status').optional().custom((value) => Object.values(ContractStatus).includes(value)).withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
    query('approval').optional().custom((value) => Object.values(ApprovalStatus).includes(value)).withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
    query('search').optional().isString().trim(),
];

const rateBodyRules = (): ValidationChain[] => [
    body('billingType')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('billingType')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('billingType')).bail()
        .custom((v) => Object.values(BillingType).includes(v))
        .withMessage(`billingType must be one of: ${Object.values(BillingType).join(', ')}`),

    body('rate')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('rate')).bail()
        .isFloat({ min: 0.01 }).withMessage('rate must be a positive number')
        .toFloat(),

    body('effectiveFrom')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('effectiveFrom')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('effectiveFrom')).bail()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE('effectiveFrom')),

    body('materialType')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('materialType')),

    body('minimumCharge')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('minimumCharge must be a non-negative number'),
    // .toFloat()
    // .custom((value, { req }) => {
    //     if (value != null && req.body.rate != null && value > req.body.rate) {
    //         throw new Error('minimumCharge cannot be greater than rate');
    //     }
    //     return true;
    // }),
    body('tollHandling')
        .optional()
        .custom((v) => Object.values(TollHandling).includes(v))
        .withMessage(`tollHandling must be one of: ${Object.values(TollHandling).join(', ')}`),
];

// ─── Contract ID param rule ───────────────────────────────────────────────────
const contractIdParam = (): ValidationChain =>
    param('id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('id'))
        .toInt();

// ─── POST /contracts/:id/rates ────────────────────────────────────────────────
export const addRateValidationRules = (): ValidationChain[] => [
    contractIdParam(),
    ...rateBodyRules(),
];
export const changeRateValidationRules = (): ValidationChain[] => [
    contractIdParam(),
    ...rateBodyRules(),
];

export const getRatesValidationRules = (): ValidationChain[] => [
    contractIdParam(),
];


export const deleteRateValidationRules = (): ValidationChain[] => [
    contractIdParam(),
    param('rateId')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('rateId')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('rateId'))
        .toInt(),
];