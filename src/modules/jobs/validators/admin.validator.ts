import { body, param, query, ValidationChain } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { JobPriority, QuantityUnit, JobStatus, JobDocumentType } from '../../../../generated/prisma';
import { BillingType, TollHandling } from '../../../../generated/prisma';


export const createJobValidationRules = (): ValidationChain[] => [

    body('clientId').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Client id")).toInt(),
    body('contractId').optional().isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Contract id")).toInt(),
    body('tipId').optional().isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Tip id")).toInt(),
    body('tipAddress')
        .if(body('tipId').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Tip address is required when a tip client is selected').bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('tipAddress')),
    body('tipRate')
        .if(body('tipId').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Tip rate is required when a tip client is selected').bail()
        .isFloat({ min: 0.01 }).withMessage('Tip rate must be a positive number')
        .toFloat(),
    body('tipBillingType')
        .if(body('tipId').exists({ checkFalsy: true }))
        .notEmpty().withMessage('Tip billing type is required when a tip client is selected').bail()
        .custom((v) => Object.values(BillingType).includes(v))
        .withMessage(`tipBillingType must be one of: ${Object.values(BillingType).join(', ')}`),

    body('vehicles')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('vehicles')).bail()
        .isArray({ min: 1 }).withMessage('At least one vehicle must be provided.'),

    body('vehicles.*.vehicleId')
        .exists().withMessage('Each vehicle entry must include a vehicleId.').bail()
        .isInt({ min: 1 }).withMessage('vehicleId must be a positive integer.')
        .toInt(),

    body('vehicles.*.driverId')
        .exists().withMessage('Each vehicle entry must include a driverId.').bail()
        .notEmpty().withMessage('driverId cannot be null or empty — every vehicle must have a driver.').bail()
        .isInt({ min: 1 }).withMessage('driverId must be a positive integer.')
        .toInt(),
    body('pickUpAddress')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('pickUpAddress')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('pickUpAddress')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('pickUpAddress')),

    body('entryDate')
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("entryDate")),

    body('deliveryDate')
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("deliveryDate"))
        .custom((value, { req }) => {
            const startStr = req.body.entryDate;
            if (startStr && value) {
                const start = new Date(startStr);
                const end = new Date(value);
                if (start >= end) {
                    throw new Error(ErrorMessages.JOB.INVALID_DATES);
                }
            }
            return true;
        }),

    body('materialId')
        .optional()
        .isInt({ min: 1 }).withMessage('materialId must be a positive integer')
        .toInt(),

    body('materialName')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('materialName')),

    body().custom((value, { req }) => {
        if (!req.body.materialId && !req.body.materialName) {
            throw new Error('Either materialId or materialName must be provided');
        }
        return true;
    }),

    body('quantity')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('quantity')).bail()
        .isFloat({ min: 0.01 }).withMessage('quantity must be a positive number')
        .toFloat(),

    body('quantityUnit')
        .custom((v) => Object.values(QuantityUnit).includes(v))
        .withMessage(`Quantity unit must be one of: ${Object.values(QuantityUnit).join(', ')}`),

    body('rate')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('rate')).bail()
        .isFloat({ min: 0.01 }).withMessage('Rate must be a positive number')
        .toFloat(),

    body('billingType')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('billingType')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('billingType')).bail()
        .custom((v) => Object.values(BillingType).includes(v))
        .withMessage(`billingType must be one of: ${Object.values(BillingType).join(', ')}`),

    body('tollHandling')
        .optional()
        .custom((v) => Object.values(TollHandling).includes(v))
        .withMessage(`tollHandling must be one of: ${Object.values(TollHandling).join(', ')}`),

    body('oneWayToll')
        .optional()
        .isFloat({ min: 0 }).withMessage('oneWayToll must be a non-negative number')
        .toFloat(),

    body('returnToll')
        .optional()
        .isFloat({ min: 0 }).withMessage('returnToll must be a non-negative number')
        .toFloat(),

    body('notes')
        .optional()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('notes')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),


    body('priority')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('priority')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('priority')).bail()
        .custom((v) => Object.values(JobPriority).includes(v))
        .withMessage(`priority must be one of: ${Object.values(JobPriority).join(', ')}`),

];


export const IdValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),
];

export const getJobByIdValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),
];

export const getJobsValidationRules = (): ValidationChain[] => [
    query('page').optional().isInt({ min: 1 }).withMessage(ErrorMessages.PAGINATION.PAGE_MUST_BE_POSITIVE_NUMBER).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage(ErrorMessages.PAGINATION.LIMIT_MUST_BETWEEN_1_AND_100).toInt(),
    query('status').optional().custom((v) => Object.values(JobStatus).includes(v)).withMessage("Invalid status"),
    query('clientId').optional().isInt({ min: 1 }).toInt(),
    query('driverId').optional().isInt({ min: 1 }).toInt(),
    query('vehicleId').optional().isInt({ min: 1 }).toInt(),
    query('search').optional().isString().trim(),
    query('priority').optional().custom((v) => Object.values(JobPriority).includes(v)).withMessage("Invalid priority"),
];


export const updateJobValidationRules = (): ValidationChain[] => [

    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),
    body('clientId').optional().isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Client id")).toInt(),
    body('contractId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Contract id")).toInt(),
    body('tipId').optional({ nullable: true }).isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Tip id")).toInt(),
    body('tipAddress').optional({ nullable: true }).isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('tipAddress')),
    body('tipRate').optional({ nullable: true }).isFloat({ min: 0.01 }).withMessage('Tip rate must be a positive number').toFloat(),
    body('tipBillingType').optional({ nullable: true }).custom((v) => Object.values(BillingType).includes(v)).withMessage("Invalid tipBillingType"),
    body('vehicles').optional().isArray({ min: 1 }).withMessage('At least one vehicle must be provided.'),
    body('vehicles.*.vehicleId')
        .if(body('vehicles').exists())
        .exists().withMessage('Each vehicle entry must include a vehicleId.').bail()
        .isInt({ min: 1 }).withMessage('vehicleId must be a positive integer.')
        .toInt(),
    body('vehicles.*.driverId')
        .if(body('vehicles').exists())
        .exists().withMessage('Each vehicle entry must include a driverId.').bail()
        .notEmpty().withMessage('driverId cannot be null or empty — every vehicle must have a driver.').bail()
        .isInt({ min: 1 }).withMessage('driverId must be a positive integer.')
        .toInt(),
    body('pickUpAddress').optional().isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('pickUpAddress')),
    body('entryDate').optional().isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("entryDate")),
    body('deliveryDate')
        .optional()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE("deliveryDate"))
        .custom((value, { req }) => {
            const startStr = req.body.entryDate;
            if (startStr && value) {
                const start = new Date(startStr);
                const end = new Date(value);
                if (start >= end) {
                    throw new Error(ErrorMessages.JOB.INVALID_DATES);
                }
            }
            return true;
        }),
    body('materialId').optional().isInt({ min: 1 }).withMessage('materialId must be a positive integer').toInt(),
    body('materialName').optional().isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('materialName')),
    body('quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be a positive number').toFloat(),
    body('quantityUnit').optional().custom((v) => Object.values(QuantityUnit).includes(v)).withMessage("Invalid quantityUnit"),
    body('rate').optional().isFloat({ min: 0.01 }).withMessage('Rate must be a positive number').toFloat(),
    body('billingType').optional().custom((v) => Object.values(BillingType).includes(v)).withMessage("Invalid billingType"),
    body('tollHandling').optional().custom((v) => Object.values(TollHandling).includes(v)).withMessage("Invalid tollHandling"),
    body('oneWayToll').optional().isFloat({ min: 0 }).withMessage('oneWayToll must be a non-negative number').toFloat(),
    body('returnToll').optional().isFloat({ min: 0 }).withMessage('returnToll must be a non-negative number').toFloat(),
    body('notes').optional().isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('notes')),
    body('priority').optional().custom((v) => Object.values(JobPriority).includes(v)).withMessage("Invalid priority"),
    body('status').optional().custom((v) => Object.values(JobStatus).includes(v)).withMessage("Invalid status")
];

export const updateJobStatusValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),
    body('status')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('status')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('status')).bail()
        .custom((v) => Object.values(JobStatus).includes(v)).withMessage("Invalid status")
];

export const upsertDispatchValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),

    // ── Required ──────────────────────────────────────────────────────────
    body('stagingLocation')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('stagingLocation')).bail()
        .notEmpty().withMessage(ErrorMessages.VALIDATION.EMPTY_VALUE('stagingLocation')).bail()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('stagingLocation')),

    body('loadingTime')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('loadingTime')).bail()
        .isISO8601().withMessage(ErrorMessages.CONTRACT.INVALID_DATE('loadingTime')),

    // ── Optional ──────────────────────────────────────────────────────────
    body('trucksLoadingAtOnce')
        .optional()
        .isInt({ min: 1 }).withMessage('trucksLoadingAtOnce must be a positive integer')
        .toInt(),

    body('njaContactName')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('njaContactName')),

    body('njaContactPhone')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('njaContactPhone')),

    body('loadingInstruction')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('loadingInstruction')),

    body('additionalInformation')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('additionalInformation')),

    body('ppeRequirements')
        .optional()
        .isString().withMessage(ErrorMessages.VALIDATION.VALUE_MUST_BE_STRING('ppeRequirements')),
];

export const uploadDispatchMediaValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("id")).toInt(),
    body('documentType')
        .exists().withMessage(ErrorMessages.VALIDATION.KEY_MISSING('documentType'))
        .isIn(Object.values(JobDocumentType)).withMessage('Invalid document type'),
];

export const getJobLogsValidationRules = (): ValidationChain[] => [
    param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("Job id")).toInt(),
];
