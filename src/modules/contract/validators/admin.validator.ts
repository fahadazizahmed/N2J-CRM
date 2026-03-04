import { body, param, query, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { CreditTerms, ContractStatus } from '../../../../generated/prisma';
import { BillingType, TollHandling } from '../../../../generated/prisma';


export const createContractValidationRules = (): ValidationChain[] => [
    body('clientId')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('clientId')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('clientId')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('clientId'))
        .toInt(),

    body('contractTitle')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contract_title')),

    body('startDate')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('startDate')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('startDate')).bail()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("startDate")),

    body('endDate')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('endDate')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('endDate')).bail()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("endDate"))
        .custom((value, { req }) => {
            const start = new Date(req.body.start_date);
            const end = new Date(value);
            if (start >= end) {
                throw new Error(ErrorMessages.CONTRACT.INVALID_DATES);
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
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('contractManagerId')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('contractManagerId')).bail()
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

];

export const uploadContractDocsValidationRules = (): ValidationChain[] => [
    body('contractId')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('contractId')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('contractId'))
        .toInt(),
    body('clientId')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('clientId')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('clientId'))
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


    body('contractTitle')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contract_title')),

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
        .withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
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
        .isFloat({ min: 0 }).withMessage('minimumCharge must be a non-negative number')
        .toFloat(),

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