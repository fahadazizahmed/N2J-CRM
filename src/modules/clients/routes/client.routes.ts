
import express from 'express';
import ClientController from '../controllers/client.controller';

const router = express.Router();
const controller = new ClientController();



export { router as clientRouter };
