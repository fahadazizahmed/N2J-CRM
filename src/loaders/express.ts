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
  app.use(json());

  app.use(cors());
  app.use(bodyParser.json());

  // Load all API routes
  app.use(config.api.prefix, authRouter);

  app.all('*', async (req, res) => {
    throw new NotFoundError(null);
  });
  // Error-handling middleware (must be registered last)
  app.use(errorHandler);
};
