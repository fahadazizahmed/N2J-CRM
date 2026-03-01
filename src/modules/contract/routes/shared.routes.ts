import express from 'express';
import SharedContractController from '../controllers/shared.controller';

const router = express.Router();
const controller = new SharedContractController();

export { router as sharedContractRouter };
