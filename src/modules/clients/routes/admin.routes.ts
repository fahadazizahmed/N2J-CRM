import express from 'express';
import AdminController from '../controllers/admin.controller';


const router = express.Router();
const controller = new AdminController();



export { router as adminRouter };
