import express from 'express';
import SharedJobController from '../controllers/shared.controller';

const router = express.Router();
const controller = new SharedJobController();

export { router as sharedJobRouter };
