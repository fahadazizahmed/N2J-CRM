import { body, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { CreditTerms } from '../../../../generated/prisma';


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


];
