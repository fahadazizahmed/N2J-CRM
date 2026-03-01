import express from 'express';
import ClientContractController from '../controllers/client.controller';

const router = express.Router();
const controller = new ClientContractController();

export { router as clientContractRouter };
