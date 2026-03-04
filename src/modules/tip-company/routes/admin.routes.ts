import express from 'express';
import routes from './routes';
import AdminTipController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';

import {
    createTipCompanyValidationRules,
    updateTipCompanyValidationRules,
    getTipCompanyByIdValidationRules,
    getTipCompaniesValidationRules
} from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import { uploadBanner } from '../helper/helper';

const router = express.Router();
const controller = new AdminTipController();

// ─── Tip Company Routes ───────────────────────────────────────────────────────

router.post(
    routes.Admin.ADD_TIP_COMPANY,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createTipCompanyValidationRules(),
    validateRequest,
    controller.createTipCompany
);
// TODO:Make it patch later
router.put(
    routes.Admin.UPDATE_TIP_COMPANY,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateTipCompanyValidationRules(),
    validateRequest,
    controller.updateTipCompany
);

router.get(
    routes.Admin.GET_TIP_COMPANY,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getTipCompanyByIdValidationRules(),
    validateRequest,
    controller.getTipCompanyById
);

router.get(
    routes.Admin.GET_TIP_COMPANIES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getTipCompaniesValidationRules(),
    validateRequest,
    controller.getTipCompanies
);

router.post(
    routes.Admin.UPLOAD_TIP_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadBanner,
    controller.getImage
);


export { router as adminTipRouter };
