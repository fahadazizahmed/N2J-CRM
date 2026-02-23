import express from 'express';
import SharedController from '../controllers/shared.controller';


const router = express.Router();
const controller = new SharedController();



export { router as sharedRouter };
