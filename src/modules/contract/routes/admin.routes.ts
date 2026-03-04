import express from 'express';
import AdminContractController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { createContractValidationRules, updateContractValidationRules, updateContractStatusValidationRules, uploadContractDocsValidationRules, getContractByIdValidationRules, getContractsValidationRules, addRateValidationRules, changeRateValidationRules, getRatesValidationRules, deleteRateValidationRules } from '../validators/admin.validator';
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

// ─── PATCH /contract/update-contract-status/:id ──────────────────────────────
router.put(
    routes.Admin.UPDATE_CONTRACT_STATUS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateContractStatusValidationRules(),
    validateRequest,
    controller.updateContractStatus
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

// ─── GET /contract/get-contract/:id ────────────────────────────────────────
router.get(
    routes.Admin.GET_CONTRACT,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getContractByIdValidationRules(),
    validateRequest,
    controller.getContractById
);

// ─── GET /contract/get-contracts ──────────────────────────────────────────
router.get(
    routes.Admin.GET_CONTRACTS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getContractsValidationRules(),
    validateRequest,
    controller.getContracts
);

// ─── Rate Management ──────────────────────────────────────────────────────────

// POST /contract/:id/rates  — add rate to a draft contract
router.post(
    routes.Admin.ADD_CONTRACT_RATE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    addRateValidationRules(),
    validateRequest,
    controller.addRate
);

router.put(
    routes.Admin.UPDATE_DRAFT_CONTRACT_RATE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    changeRateValidationRules(),
    validateRequest,
    controller.updateDraftContract
);

router.put(
    routes.Admin.CHANGE_CONTRACT_RATE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    changeRateValidationRules(),
    validateRequest,
    controller.changeRate
);

router.get(
    routes.Admin.GET_CONTRACT_RATES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getRatesValidationRules(),
    validateRequest,
    controller.getRates
);


export { router as adminContractRouter };
