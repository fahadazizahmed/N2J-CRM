
import express from 'express';
import ClientAuthController from '../controllers/client.controller';

const router = express.Router();
const controller = new ClientAuthController();



export { router as clientAuthRouter };
