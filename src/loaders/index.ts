import expressLoader from './express';
import { Application } from 'express';

export default async ({ expressApp }: { expressApp: Application }) => {
  // Prisma client is initialized when imported
  // No need for explicit connection call
  expressLoader({ app: expressApp });
  // Logger.info("✌️ Express loaded");
};
