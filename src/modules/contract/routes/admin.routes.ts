import express from 'express';
import AdminContractController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { createContractValidationRules, updateContractValidationRules, uploadContractDocsValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';
import { uploadContractDocs } from '../helper';

const router = express.Router();
const controller = new AdminContractController();

// ─── Contract Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.ADD_CONTRACT_GENERAL_INFO,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createContractValidationRules(),
    validateRequest,
    controller.createContract
);

router.put(
    routes.Admin.UPDATE_CONTRACT_GENERAL_INFO,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateContractValidationRules(),
    validateRequest,
    controller.updateContract
);

router.post(
    routes.Admin.UPLOAD_CONTRACT_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadContractDocs,
    uploadContractDocsValidationRules(),
    validateRequest,
    controller.uploadDocs
);

export { router as adminContractRouter };
