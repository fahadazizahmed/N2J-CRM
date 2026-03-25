import express from 'express';
import ClientJobController from '../controllers/client.controller';

const router = express.Router();
const controller = new ClientJobController();

export { router as clientJobRouter };
