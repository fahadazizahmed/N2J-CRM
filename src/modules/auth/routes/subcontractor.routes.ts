
import express from 'express';
import SubcontractorAuthController from '../controllers/subcontractor.controller';

const router = express.Router();
const controller = new SubcontractorAuthController();


export { router as subAuthRouter };
