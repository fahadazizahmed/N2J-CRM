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
            .normalizeEmail()
            .toLowerCase(),

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
    ];
};
