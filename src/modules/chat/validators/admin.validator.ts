import { body, param, query, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { JobPriority, QuantityUnit, JobStatus, JobDocumentType } from '../../../../generated/prisma';
import { BillingType, TollHandling } from '../../../../generated/prisma';


export const createMessageValidationRules = (): ValidationChain[] => [
    body('jobId')
        .notEmpty().withMessage('jobId is required')
        .isInt({ min: 1 }).withMessage('jobId must be a positive integer')
        .toInt(),

    body('message')
        .notEmpty().withMessage('Message is required')
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('message')),

    body('recipientType')
        .notEmpty().withMessage('recipientType is required')
        .isIn(['all', 'single']).withMessage('recipientType must be "all" or "single"'),

    body('driverId')
        .optional()
        .isInt({ min: 1 }).withMessage('driverId must be a positive integer')
        .toInt(),
];

export const getMessagesValidationRules = (): ValidationChain[] => [
    param('jobId')
        .notEmpty().withMessage('jobId is required')
        .isInt({ min: 1 }).withMessage('jobId must be a positive integer')
        .toInt(),
];

