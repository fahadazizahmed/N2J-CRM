import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = ['admin', 'driver', 'subcontractor', 'client'];

// ─── Default Admin Credentials ───────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@1234A';   // min 9 chars, 1 uppercase, 1 digit
const ADMIN_NAME = 'Super Admin';

async function main() {

    // 1. Seed roles
    console.log('Seeding roles...');
    for (const roleName of ROLES) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });
        console.log(`  ✔ role: ${roleName}`);
    }

    // 2. Seed admin user
    console.log('\nSeeding admin user...');

    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},                         // already exists → leave untouched
        create: {
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            password_hash,
            status: 1,
            invite_token: null,
            roles: { connect: { id: adminRole!.id } },
        },
    });

    console.log(`  ✔ admin user: ${admin.email}`);
    console.log('\n✅ Seeding finished.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
