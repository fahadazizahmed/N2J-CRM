import express from 'express';
import AdminMessageController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { createMessageValidationRules, getMessagesValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';

const router = express.Router();
const controller = new AdminMessageController();


// ─── Contract Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.SEND_MESSAGE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createMessageValidationRules(),
    validateRequest,
    controller.sendMessage
);

router.get(
    routes.Admin.GET_MESSAGES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getMessagesValidationRules(),
    validateRequest,
    controller.getMessages
);

export { router as adminMessageRouter };
