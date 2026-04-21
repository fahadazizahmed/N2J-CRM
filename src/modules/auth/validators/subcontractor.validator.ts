import { body, query, param, ValidationChain } from 'express-validator';
import { DriverType, LicenseClass, DriverDocumentType, SubcontractorStatus, SubcontractorDocumentType } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { isValidABN, isValidPhone } from '../../../helper/helper.method';
import { CountryCode } from 'libphonenumber-js';


export const createSubcontractorValidationRules = () => {
    return [
        body('companyName')
            .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('companyName')).bail()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('companyName')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('companyName')),

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

        body('status')
            .optional()
            .isIn(Object.values(SubcontractorStatus)).withMessage('Invalid status'),

        body('address')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('address')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('address')),

        body('subcontractorContactName')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactName')),

        body('subcontractorContactEmail')
            .optional()
            .isEmail().withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

        body('subcontractorContactPhone')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactPhone')),

        body('hourlyRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('hourlyRate'))
            .toInt(),

        body('travelHoursRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('travelHoursRate'))
            .toInt(),

        body('perLoadRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('perLoadRate'))
            .toInt(),

        body('perToneRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('perToneRate'))
            .toInt(),

        body('notes')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),

        body('sendInvite')
            .optional()
            .custom((value, { req }) => {
                const isInvite = value === true || value === 'true';
                if (isInvite && (!req.body.email || req.body.email.trim() === '')) {
                    throw new Error('Login email is required when sendInvite is true');
                }
                return true;
            }),

        body('email')
            .optional({ checkFalsy: true })
            .isEmail().withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

    ];
};

export const updateSubcontractorValidationRules = () => {
    return [
        param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("id")).toInt(),

        body('companyName')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('companyName')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('companyName')),

        body('phone')
            .optional()
            .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('phone')).bail()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('phone'))
            .bail()
            .custom((value, { req }) => {
                const country = req.body.countryCode as CountryCode;
                if (!country && value) throw new Error('countryCode is required when phone is provided');
                if (country && !isValidPhone(value, country)) throw new Error(`Invalid phone number for country ${country}`);
                return true;
            }),

        body('countryCode')
            .optional()
            .isString()
            .withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('countryCode')),

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

        body('subcontractorContactName')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactName')),

        body('subcontractorContactEmail')
            .optional()
            .isEmail().withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

        body('subcontractorContactPhone')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('contractContactPhone')),

        body('hourlyRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('hourlyRate'))
            .toInt(),

        body('travelHoursRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('travelHoursRate'))
            .toInt(),

        body('perLoadRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('perLoadRate'))
            .toInt(),

        body('perToneRate')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('perToneRate'))
            .toInt(),

        body('notes')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),

        body('sendInvite')
            .optional()
            .custom((value, { req }) => {
                const isInvite = value === true || value === 'true';
                if (isInvite && (!req.body.email || req.body.email.trim() === '')) {
                    throw new Error('Login email is required when sendInvite is true');
                }
                return true;
            }),

        body('email')
            .optional({ checkFalsy: true })
            .isEmail().withMessage(ErrorMessages.AUTH.INVALID_EMAIL),

        body('status')
            .optional()
            .isIn(Object.values(SubcontractorStatus)).withMessage('Invalid status'),

    ];
};

export const uploadSubcontractorMediaValidationRules = () => {
    return [
        param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("id")).toInt(),
        body('documentType')
            .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('documentType'))
            .isIn(Object.values(SubcontractorDocumentType)).withMessage('Invalid document type'),
    ];
};

export const getSubcontractorsValidationRules = () => {
    return [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('page'))
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID('limit'))
            .toInt(),
        query('search')
            .optional()
            .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('search')),
        query('status')
            .optional()
            .isIn(Object.values(SubcontractorStatus)).withMessage('Invalid status'),
    ];
};

export const getAllSubcontractorsListValidationRules = () => {
    return [
        query('status')
            .optional()
            .isIn(Object.values(SubcontractorStatus)).withMessage('Invalid status'),
    ];
};