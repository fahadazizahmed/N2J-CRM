
import express from 'express';
import SubcontractorAuthController from '../controllers/subcontractor.controller';
import routes from './routes';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import { createSubcontractorValidationRules, updateSubcontractorValidationRules, uploadSubcontractorMediaValidationRules, getSubcontractorsValidationRules, getAllSubcontractorsListValidationRules } from '../validators/subcontractor.validator';
import { param } from 'express-validator';
import ErrorMessages from '../../../common/constant/errors';
import { validateRequest } from '../../../middlewares';
import { uploadSubContractorDocs } from '../helper';

const router = express.Router();
const controller = new SubcontractorAuthController();

router.post(
    routes.SubContractor.ADD_NEW_SUB_CONTRACTOR,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createSubcontractorValidationRules(),
    validateRequest,
    controller.createSubContractor
);
router.put(
    routes.SubContractor.UPDATE_SUB_CONTRACTOR,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateSubcontractorValidationRules(),
    validateRequest,
    controller.updateSubContractor
);


router.post(
    routes.SubContractor.UPLOAD_SUB_CONTRACTOR_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadSubContractorDocs,
    uploadSubcontractorMediaValidationRules(),
    validateRequest,
    controller.uploadDocs
);


router.get(
    routes.SubContractor.GET_SUB_CONTRACTOR_BY_ID,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    [
        param('id').isInt({ min: 1 }).withMessage(ErrorMessages.VALIDATION.INVALID_ID("id")).toInt()
    ],
    validateRequest,
    controller.getSubcontractorById
);

router.get(
    routes.SubContractor.GET_ALL_SUB_CONTRACTORS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getSubcontractorsValidationRules(),
    validateRequest,
    controller.getSubcontractors
);

router.get(
    routes.SubContractor.GET_ALL_SUB_CONTRACTORS_LIST,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getAllSubcontractorsListValidationRules(),
    validateRequest,
    controller.getSubcontractorsList
);

export { router as subAuthRouter };
