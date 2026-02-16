import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const ROLES = [
    'admin',
    'driver',
    'subcontractor',
    'client'
];

async function main() {
    console.log(`Start seeding roles...`);

    for (const roleName of ROLES) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
            },
        });
        console.log(`Created/Updated role: ${role.name}`);
    }

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
