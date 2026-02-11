import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../develop.env');
dotenv.config({ path: envPath });

import prisma from '../src/utils/prisma.util';
import { hashPassword } from '../src/utils/hash.util';

/**
 * Prisma Seed Script
 * 1. Populates Roles table with all UserRole enum values
 * 2. Creates a hardcoded admin user for initial setup
 */

async function seed() {
    console.log('🌱 Starting database seed...');

    try {
        // ============================================
        // Step 1: Seed Roles Table
        // ============================================
        console.log('\n📋 Seeding Roles table...');

        const roles = [
            {
                name: 'ADMIN',
                description: 'Full system access and management',
                permissions: {
                    users: ['create', 'read', 'update', 'delete'],
                    jobs: ['create', 'read', 'update', 'delete'],
                    invoices: ['create', 'read', 'update', 'delete'],
                    vehicles: ['create', 'read', 'update', 'delete'],
                    drivers: ['create', 'read', 'update', 'delete'],
                    compliance: ['create', 'read', 'update', 'delete'],
                    system: ['configure', 'audit']
                }
            },
            {
                name: 'MANAGER',
                description: 'Manage operations, jobs, and staff',
                permissions: {
                    users: ['read', 'update'],
                    jobs: ['create', 'read', 'update'],
                    invoices: ['read', 'update'],
                    vehicles: ['read', 'update'],
                    drivers: ['read', 'update'],
                    compliance: ['read', 'update']
                }
            },
            {
                name: 'DRIVER',
                description: 'Access to assigned jobs and vehicle information',
                permissions: {
                    jobs: ['read', 'update'],
                    vehicles: ['read'],
                    checklists: ['create', 'read', 'update']
                }
            },
            {
                name: 'CLIENT',
                description: 'View jobs and invoices',
                permissions: {
                    jobs: ['read'],
                    invoices: ['read']
                }
            },
            {
                name: 'SUBCONTRACTOR',
                description: 'Manage assigned jobs and contracts',
                permissions: {
                    jobs: ['read', 'update'],
                    contracts: ['read']
                }
            }
        ];

        for (const role of roles) {
            const existingRole = await prisma.role.findUnique({
                where: { name: role.name as any }
            });

            if (!existingRole) {
                await prisma.role.create({
                    data: role as any
                });
                console.log(`   ✅ Created role: ${role.name}`);
            } else {
                console.log(`   ⏭️  Role already exists: ${role.name}`);
            }
        }

        // ============================================
        // Step 2: Create Admin User
        // ============================================
        console.log('\n👤 Seeding Admin User...');

        const adminEmail = 'admin@gmail.com'.toLowerCase();
        const adminPassword = '12345678';

        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: {
                email: adminEmail,
                role: 'ADMIN'
            },
        });

        if (existingAdmin) {
            console.log('   ✅ Admin user already exists. Skipping.');
        } else {
            // Hash the password
            const hashedPassword = await hashPassword(adminPassword);

            // Create admin user with new schema
            const admin = await prisma.user.create({
                data: {
                    name: 'System Administrator', // Optional but providing default
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    status: 1 // Active
                },
            });

            console.log('   ✅ Admin user created successfully!');
            console.log(`      Email: ${admin.email}`);
            console.log(`      Role: ${admin.role}`);
            console.log(`      Status: ${admin.status === 1 ? 'Active' : 'Inactive'}`);
            console.log(`      ID: ${admin.id}`);
        }

        console.log('\n✅ Database seeding completed successfully!');
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
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
