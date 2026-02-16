import { PrismaClient } from '../../generated/prisma';

// Create a single instance of Prisma Client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

export const connectToDatabase = async (retryCount = 0) => {
  try {
    await prisma.$connect();
    console.info(`
      \x1b[32m################################################
      ✌️ PostgreSQL loaded and connected!
      ################################################\x1b[0m
    `);
  } catch (error) {
    console.error('\x1b[31mError connecting to PostgreSQL:', error, '\x1b[0m');

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.warn(`Retrying connection... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectToDatabase(retryCount + 1), RETRY_DELAY);
    } else {
      console.error('\x1b[31mMax retries reached. Exiting...\x1b[0m');
      process.exit(1);
    }
  }
};

// Deprecated: For backward compatibility if needed, but preferably update callers
export const connectToDB = connectToDatabase;
