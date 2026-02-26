
import express from 'express';
import ClientCrmController from '../controllers/client.controller';

const router = express.Router();

const controller = new ClientCrmController();



export { router as clientCrmRouter };
