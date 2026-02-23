import { body, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';

const VALID_GST_STATUSES = ['Pending', 'Approved', 'Not_Approved'] as const;
const VALID_CREDIT_TERMS = ['Net_7', 'Net_14', 'Net_30', 'Net_60'] as const;
const VALID_CLIENT_STATUS = ['Pending_Review', 'Active', 'Suspended'] as const;

export const createClientValidationRules = (): ValidationChain[] => [

    // Accepted but NOT persisted to clients table — used for notifications etc.
    body('email')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('email')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('email')).bail()
        .isEmail().withMessage('email must be a valid email address'),

    // Fix: .toInt() converts string "1" → number 1 before Prisma receives it
    body('user_id')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('user_id')).bail()
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_DATA_TYPE('user_id', 'positive integer'))
        .toInt(),

    body('company_name')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('company_name')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('company_name')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('company_name')).bail()
        .isLength({ max: 150 }).withMessage(ErrorMessages.VALIDATION.MAX_LENGTH_ERROR('company_name', 150)),

    body('abn')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('abn')).bail()
        .matches(/^\d{11}$/).withMessage('ABN must be exactly 11 digits'),

    body('address')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('address')),

    body('phone')
        .optional()
        .trim()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone')).bail()
        .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('phone must be a valid phone number'),

    body('gst_approved')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('gst_approved')).bail()
        .isIn(VALID_GST_STATUSES)
        .withMessage(`gst_approved must be one of: ${VALID_GST_STATUSES.join(', ')}`),

    body('credit_terms')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('credit_terms')).bail()
        .isIn(VALID_CREDIT_TERMS)
        .withMessage(`credit_terms must be one of: ${VALID_CREDIT_TERMS.join(', ')}`),

    // Fix: .toInt() converts string "750" → number 750
    body('credit_score')
        .optional()
        .isInt({ min: 0, max: 1000 }).withMessage(ErrorMessages.VALIDATION.INVALID_DATA_TYPE('credit_score', 'integer between 0-1000'))
        .toInt(),

    body('status')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status')).bail()
        .isIn(VALID_CLIENT_STATUS)
        .withMessage(`status must be one of: ${VALID_CLIENT_STATUS.join(', ')}`),
];
