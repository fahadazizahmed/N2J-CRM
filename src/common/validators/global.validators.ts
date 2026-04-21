import { param, body, ValidationChain } from 'express-validator';
import ErrorMessages from '../constant/errors';

/**
 * Global validation method for validating ID in parameters
 * @param paramName The name of the parameter (default: 'id')
 * @param fieldName The name to display in error messages (default: 'id')
 */
export const validateParamId = (paramName: string = 'id', fieldName: string = 'id'): ValidationChain => {
    return param(paramName)
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING(fieldName))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID(fieldName))
        .toInt();
};

/**
 * Global validation method for validating ID in body
 * @param bodyName The name of the body field
 * @param fieldName The name to display in error messages
 */
export const validateBodyId = (bodyName: string, fieldName: string): ValidationChain => {
    return body(bodyName)
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING(fieldName))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID(fieldName))
        .toInt();
};
