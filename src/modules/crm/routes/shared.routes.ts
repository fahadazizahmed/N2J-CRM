import express from 'express';
import SharedCrmController from '../controllers/shared.controller';


const router = express.Router();
const controller = new SharedCrmController();



export { router as sharedCrmRouter };
