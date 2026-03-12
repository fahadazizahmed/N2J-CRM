import { body, param, query, ValidationChain } from 'express-validator';
import { VehicleStatus } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';

export const createVehicleValidationRules = () => {
    return [
        body('registrationNumber').notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Registration number')).isString(),
        body('vehicleTypeId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Vehicle type id")).toInt(),
        body('vehicleTypeName').optional({ nullable: true }).isString(),
        body().custom((value) => {
            if (!value.vehicleTypeId && !value.vehicleTypeName) {
                throw new Error('Either Vehicle type ID or new Vehicle type name must be provided');
            }
            return true;
        }),

        body('make')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('make')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('make')),

        body('model')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('model')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('model')),


        body('makeYear')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('makeYear')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('makeYear'))
            .toInt(),

        body('driverId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Driver id")).toInt(),

        body('mileage')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('mileage')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('mileage'))
            .toInt(),

        body('lastServiceDate')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('lastServiceDate')).bail()
            .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("lastServiceDate")),


        body('serviceMileage')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('serviceMileage')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('serviceMileage'))
            .toInt(),


        body('notes')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('notes')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),

        body('status').optional().isIn(Object.values(VehicleStatus)).withMessage('Invalid status')
    ];
};

export const updateVehicleValidationRules = () => {
    return [
        body('registrationNumber').notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('Registration number')).isString(),
        body('vehicleTypeId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Vehicle type id")).toInt(),
        body('vehicleTypeName').optional({ nullable: true }).isString(),

        body('make')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('make')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('make')),

        body('model')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('model')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('model')),

        body('makeYear')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('makeYear')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('makeYear'))
            .toInt(),

        body('driverId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Driver id")).toInt(),

        body('mileage')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('mileage')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('mileage'))
            .toInt(),

        body('lastServiceDate')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('lastServiceDate')).bail()
            .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("lastServiceDate")),

        body('serviceMileage')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('serviceMileage')).bail()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('serviceMileage'))
            .toInt(),

        body('notes')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('notes')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),

        body('status').optional().isIn(Object.values(VehicleStatus)).withMessage('Invalid status')
    ];
};



export const uploadVehicleMediaValidationRules = () => {
    return [
        param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("id")).toInt()
    ];
};



export const getVehiclesValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage(ErrorMessages.PAGINATION.PAGE_MUST_BE_POSITIVE_NUMBER).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.PAGINATION.LIMIT_MUST_BETWEEN_1_AND_100).toInt(),
    query('status').optional().custom((value) => Object.values(VehicleStatus).includes(value)).withMessage(ErrorMessages.FLEET.INVALID_VEHICLE_STATUS),
    query('search').optional().isString().trim(),
];