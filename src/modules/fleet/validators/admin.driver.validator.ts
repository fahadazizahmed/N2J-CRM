import { body, query, param, ValidationChain } from 'express-validator';
import { DriverType, LicenseClass, DriverDocumentType } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { isValidPhone } from '../../../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';


export const createDriverValidationRules = () => {
    return [
        body('firstName').notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('First name')).isString(),
        body('lastName').notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Last name')).isString(),
        body('email')
            .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Email'))
            .isEmail().withMessage(ErrorMessages.VALIDATION.INVALID_EMAIL_FORMAT),
        body('phone')
            .optional() // makes phone optional
            .isString()
            .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
            .bail()
            .custom((value, { req }) => {
                const country = req.body.countryCode as CountryCode;

                if (!country) {
                    throw new Error('Country code is required');
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

        body('vehicleId').optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Vehicle id"))
            .toInt(),

        body('driverType')
            .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Driver type'))
            .isIn(Object.values(DriverType)).withMessage('Invalid driver type'),

        body('licenseNumber')
            .optional({ checkFalsy: true }).isString().notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('License number')),

        body('licenseClass')
            .optional({ nullable: true })
            .isIn(Object.values(LicenseClass)).withMessage('Invalid license class'),

        body('isMobileAccess')
            .optional()
            .isBoolean().withMessage('isMobileAccess must be a boolean')
            .toBoolean(),
        ...addDriverRateValidationRules()
    ];
};

export const addDriverRateValidationRules = () => {
    return [
        // body('hourlyRate').optional({ nullable: true }).isNumeric().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_NUMERIC('Hourly rate')),

        body('hourlyRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('hourlyRate'))
            .toInt(),

        body('hourlyRateWeekend')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('hourlyRateWeekend'))
            .toInt(),

        body('nightRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('nightRate'))
            .toInt(),

        body('nightRateWeekend')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('nightRateWeekend'))
            .toInt(),

    ];
};

export const updateDriverValidationRules = () => {
    return [
        body('firstName').optional().notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('First name')).isString(),
        body('lastName').optional().notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Last name')).isString(),
        // body('email')
        //     .optional()
        //     .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Email'))
        //     .isEmail().withMessage(ErrorMessages.VALIDATION.INVALID_EMAIL_FORMAT),
        body('phone')
            .optional() // makes phone optional
            .isString()
            .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
            .bail()
            .custom((value, { req }) => {
                const country = req.body.countryCode as CountryCode;

                if (!country) {
                    throw new Error('Country code is required');
                }

                if (!isValidPhone(value, country)) {
                    throw new Error(`Invalid phone number for country ${country}`);
                }

                return true;
            }),

        body('vehicleId')
            .optional({ nullable: true })
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Vehicle id"))
            .toInt(),

        body('driverType')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Driver type'))
            .isIn(Object.values(DriverType)).withMessage('Invalid driver type'),

        body('licenseNumber')
            .optional({ nullable: true }).isString().notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('License number')),

        body('licenseClass')
            .optional({ nullable: true })
            .isIn(Object.values(LicenseClass)).withMessage('Invalid license class'),

        body('licenseExpiry')
            .optional({ nullable: true })
            .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("licenseExpiry")),

        body('isMobileAccess')
            .optional()
            .isBoolean().withMessage('isMobileAccess must be a boolean')
            .toBoolean(),

        ...addDriverRateValidationRules()
    ];
};


export const getDriversValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage(ErrorMessages.PAGINATION.PAGE_MUST_BE_POSITIVE_NUMBER).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.PAGINATION.LIMIT_MUST_BETWEEN_1_AND_100).toInt(),
    query('status').optional().custom((value) => Object.values(DriverType).includes(value as any)).withMessage(ErrorMessages.CLIENT.INVALID_CLIENT_STATUS),
    query('search').optional().isString().trim(),
];

export const uploadDriverDocsValidationRules = (): ValidationChain[] => {
    return [
        body('documentType')
            .notEmpty().withMessage(ErrorMessages.VALIDATION.REQURED_FILED_MISSING('Document type'))
            .custom((value) => {
                const allowedTypes = [...Object.values(DriverDocumentType), 'profile'];
                if (!allowedTypes.includes(value as any)) {
                    throw new Error('Invalid document type');
                }
                return true;
            }),
        body('expiryDate')
            .optional({ nullable: true })
            .isISO8601().withMessage('Invalid expiry date format')
            .custom((value) => {
                if (new Date(value) <= new Date()) {
                    throw new Error('Expiry date must be in the future');
                }
                return true;
            }),
    ];
};















