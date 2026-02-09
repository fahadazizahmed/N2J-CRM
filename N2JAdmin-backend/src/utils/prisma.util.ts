import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Singleton Prisma Client Instance
 * This ensures only one instance of PrismaClient is used across the application
 */

let prisma: PrismaClient;
let pool: Pool;

/**
 * Get or create Prisma Client instance
 * Uses PostgreSQL adapter for Prisma v7 compatibility
 */
export const getPrismaClient = (): PrismaClient => {
    if (!prisma) {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not defined in environment variables');
        }

        // Create PostgreSQL connection pool
        pool = new Pool({
            connectionString: databaseUrl,
        });

        // Create Prisma adapter for PostgreSQL
        const adapter = new PrismaPg(pool);

        // Initialize Prisma Client with adapter
        prisma = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'develop.env' ? ['query', 'error', 'warn'] : ['error'],
        });

        console.log('✅ Database connected successfully!');
        console.log(`📦 PostgreSQL: ${databaseUrl.split('@')[1].split('?')[0]}`);

        // Handle graceful shutdown
        const cleanup = async () => {
            await prisma.$disconnect();
            await pool.end();
        };

        process.on('beforeExit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }

    return prisma;
};

// Export default instance for convenience
export default getPrismaClient();
