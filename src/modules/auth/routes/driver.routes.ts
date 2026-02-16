
import express from 'express';
import DriverAuthController from '../controllers/driver.controller';

const router = express.Router();
const controller = new DriverAuthController();



export { router as driverAuthRouter };
