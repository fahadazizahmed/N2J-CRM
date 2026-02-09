import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../develop.env');
dotenv.config({ path: envPath });

import prisma from '../src/utils/prisma.util';
import { hashPassword } from '../src/utils/hash.util';

/**
 * Prisma Seed Script
 * Creates a hardcoded admin user for initial setup
 */

async function seed() {
    console.log('🌱 Starting database seed...');

    const adminEmail = 'admin@gmail.com'.toLowerCase();
    const adminPassword = '12345678';

    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { email: adminEmail },
        });

        if (existingAdmin) {
            console.log('✅ Admin user already exists. Skipping seed.');
            return;
        }

        // Hash the password
        const hashedPassword = await hashPassword(adminPassword);

        // Create admin user
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                role: 'ADMIN',
            },
        });

        console.log('✅ Admin user created successfully!');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   ID: ${admin.id}`);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
seed()
    .catch((error) => {
        console.error('Fatal error during seed:', error);
        process.exit(1);
    });
