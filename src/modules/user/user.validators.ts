import { body } from 'express-validator';
import { UserRoles } from './user.dto';

/**
 * Validation rules for user creation using express-validator
 */

export const createUserValidationRules = () => {
    return [
        // Email validation
        body('email')
            .exists()
            .withMessage('Email is required')
            .bail()
            .notEmpty()
            .withMessage('Email cannot be empty')
            .bail()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .bail()
            .normalizeEmail({ all_lowercase: true }),

        // Password validation
        body('password')
            .exists()
            .withMessage('Password is required')
            .bail()
            .notEmpty()
            .withMessage('Password cannot be empty')
            .bail()
            .isString()
            .withMessage('Password must be a string')
            .bail()
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long'),

        // Role validation
        body('role')
            .exists()
            .withMessage('Role is required')
            .bail()
            .notEmpty()
            .withMessage('Role cannot be empty')
            .bail()
            .isIn(UserRoles)
            .withMessage(`Role must be one of: ${UserRoles.join(', ')}`),

        // ==================== DRIVER ROLE VALIDATIONS ====================
        // Driver Data - Required when role is DRIVER
        body('driverData')
            .if(body('role').equals('DRIVER'))
            .exists()
            .withMessage('Driver data is required for DRIVER role')
            .bail()
            .isObject()
            .withMessage('Driver data must be an object'),

        body('driverData.firstName')
            .if(body('role').equals('DRIVER'))
            .exists()
            .withMessage('Driver first name is required')
            .bail()
            .notEmpty()
            .withMessage('Driver first name cannot be empty')
            .bail()
            .isString()
            .withMessage('Driver first name must be a string'),

        body('driverData.lastName')
            .if(body('role').equals('DRIVER'))
            .exists()
            .withMessage('Driver last name is required')
            .bail()
            .notEmpty()
            .withMessage('Driver last name cannot be empty')
            .bail()
            .isString()
            .withMessage('Driver last name must be a string'),

        body('driverData.licenseNumber')
            .if(body('role').equals('DRIVER'))
            .exists()
            .withMessage('Driver license number is required')
            .bail()
            .notEmpty()
            .withMessage('Driver license number cannot be empty')
            .bail()
            .isString()
            .withMessage('Driver license number must be a string'),

        body('driverData.insuranceDetails')
            .optional()
            .isString()
            .withMessage('Insurance details must be a string'),

        body('driverData.whiteCard')
            .optional()
            .isString()
            .withMessage('White card must be a string'),

        body('driverData.type')
            .optional()
            .isIn(['IN_HOUSE', 'SUBCONTRACTOR'])
            .withMessage('Driver type must be IN_HOUSE or SUBCONTRACTOR'),

        body('driverData.status')
            .optional()
            .isIn(['ACTIVE', 'MAINTENANCE', 'IDLE', 'OUT_OF_SERVICE'])
            .withMessage('Driver status must be ACTIVE, MAINTENANCE, IDLE, or OUT_OF_SERVICE'),

        // ==================== CLIENT ROLE VALIDATIONS ====================
        // Client Data - Required when role is CLIENT
        body('clientData')
            .if(body('role').equals('CLIENT'))
            .exists()
            .withMessage('Client data is required for CLIENT role')
            .bail()
            .isObject()
            .withMessage('Client data must be an object'),

        body('clientData.companyName')
            .if(body('role').equals('CLIENT'))
            .exists()
            .withMessage('Company name is required')
            .bail()
            .notEmpty()
            .withMessage('Company name cannot be empty')
            .bail()
            .isString()
            .withMessage('Company name must be a string'),

        body('clientData.contactName')
            .if(body('role').equals('CLIENT'))
            .exists()
            .withMessage('Contact name is required')
            .bail()
            .notEmpty()
            .withMessage('Contact name cannot be empty')
            .bail()
            .isString()
            .withMessage('Contact name must be a string'),

        body('clientData.email')
            .if(body('role').equals('CLIENT'))
            .exists()
            .withMessage('Client email is required')
            .bail()
            .notEmpty()
            .withMessage('Client email cannot be empty')
            .bail()
            .isEmail()
            .withMessage('Client email must be a valid email address'),

        body('clientData.phone')
            .if(body('role').equals('CLIENT'))
            .exists()
            .withMessage('Client phone is required')
            .bail()
            .notEmpty()
            .withMessage('Client phone cannot be empty')
            .bail()
            .isString()
            .withMessage('Client phone must be a string'),

        body('clientData.address')
            .optional()
            .isString()
            .withMessage('Client address must be a string'),

        // ==================== SUBCONTRACTOR ROLE VALIDATIONS ====================
        // Subcontractor Data - Required when role is SUBCONTRACTOR
        body('subcontractorData')
            .if(body('role').equals('SUBCONTRACTOR'))
            .exists()
            .withMessage('Subcontractor data is required for SUBCONTRACTOR role')
            .bail()
            .isObject()
            .withMessage('Subcontractor data must be an object'),

        body('subcontractorData.companyName')
            .if(body('role').equals('SUBCONTRACTOR'))
            .exists()
            .withMessage('Company name is required')
            .bail()
            .notEmpty()
            .withMessage('Company name cannot be empty')
            .bail()
            .isString()
            .withMessage('Company name must be a string'),

        body('subcontractorData.contactName')
            .if(body('role').equals('SUBCONTRACTOR'))
            .exists()
            .withMessage('Contact name is required')
            .bail()
            .notEmpty()
            .withMessage('Contact name cannot be empty')
            .bail()
            .isString()
            .withMessage('Contact name must be a string'),

        body('subcontractorData.email')
            .if(body('role').equals('SUBCONTRACTOR'))
            .exists()
            .withMessage('Subcontractor email is required')
            .bail()
            .notEmpty()
            .withMessage('Subcontractor email cannot be empty')
            .bail()
            .isEmail()
            .withMessage('Subcontractor email must be a valid email address'),

        body('subcontractorData.phone')
            .if(body('role').equals('SUBCONTRACTOR'))
            .exists()
            .withMessage('Subcontractor phone is required')
            .bail()
            .notEmpty()
            .withMessage('Subcontractor phone cannot be empty')
            .bail()
            .isString()
            .withMessage('Subcontractor phone must be a string'),

        body('subcontractorData.address')
            .optional()
            .isString()
            .withMessage('Subcontractor address must be a string'),
    ];
};
