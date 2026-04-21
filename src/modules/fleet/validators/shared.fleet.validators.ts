import { body, param, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { VehicleCategory, VehicleDocumentType, VehicleStatus } from '../../../../generated/prisma';
export const assignVehicleValidationRules = (): ValidationChain[] => [
    param('id')
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Driver id'))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('Driver id'))
        .toInt(),
    body('vehicleId')
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Vehicle id'))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('Vehicle id'))
        .toInt(),
];

export const assignDriverValidationRules = (): ValidationChain[] => [
    param('id')
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Driver id'))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('Driver id'))
        .toInt(),
    body('driverId')
        .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Vehicle id'))
        .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('Vehicle id'))
        .toInt(),
];
