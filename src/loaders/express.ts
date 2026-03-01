import express, { Request, Response } from 'express';
import bodyParser, { json } from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import compression from 'compression';
import hpp from 'hpp';
import { NotFoundError } from '../errors';
import { errorHandler } from '../middlewares';
import config from '../config';
import authRouter from '../modules/auth/routes';
import crmRouter from '../modules/crm/routes';
import tipRouter from '../modules/tip-company/routes';
import contractRouter from '../modules/contract/routes';
import cookieParser from "cookie-parser";

export default ({ app }: { app: express.Application }) => {
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');
  // Set security HTTP headers
  app.use(helmet());
  // Body parser, reading data from body into req.body
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Prevent parameter pollution
  app.use(
    hpp({
      whitelist: [
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price',
      ],
    })
  );
  app.use(cookieParser());
  app.use(compression());

  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */
  app.get('/status', (req: Request, res: Response) => {
    res.status(200).end();
  });

  app.head('/status', (req: Request, res: Response) => {
    res.status(200).end();
  });

  // Middleware that transforms the raw string of req.body into json


  // const allowedOrigins = [
  //   process.env.FRONT_END_DOMAIN,
  //   'http://127.0.0.1:5173',

  //   // 'http://192.168.100.118:5173'
  // ];

  // app.use(cors({
  //   origin: allowedOrigins,
  //   credentials: true, // 🔥 allow cookies
  // }));


  app.use(cors({
    origin: "*",
    credentials: true,
  }))


  app.use(bodyParser.json());

  // Load all API routes
  app.use(config.api.prefix, authRouter);
  app.use(config.api.prefix, crmRouter);
  app.use(config.api.prefix, tipRouter);
  app.use(config.api.prefix, contractRouter);

  app.all('*', async (req, res) => {
    throw new NotFoundError(null);
  });
  // Error-handling middleware (must be registered last)
  app.use(errorHandler);
};

