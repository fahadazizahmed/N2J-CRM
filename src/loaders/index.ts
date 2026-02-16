import expressLoader from './express';
import { Application } from 'express';
import { connectToDB } from '../connection/db';

export default async ({ expressApp }: { expressApp: Application }) => {
  connectToDB();
  expressLoader({ app: expressApp });
  // Logger.info("✌️ Express loaded");
};
