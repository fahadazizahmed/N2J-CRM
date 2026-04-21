import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const ROLES = [
    'admin',
    'driver',
    'subcontractor',
    'client'
];
const VEHICLE_TYPES = [
    "Bogie",
    "8 Wheeler",
    "10 Wheeler",
    "Tri-axle / Superdog",
    "Quad",
    "Quin",
    "Walking Floor",
    "A-Double",
    "B-Double",
    "Semi",
    "Side Tipper",
    "Prime Mover"
];

const PRE_MATERIALS = [
    "Hydraulic Oil",
    "VENM",
    "Gravel",
    "Sand"
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

    for (const vehicleType of VEHICLE_TYPES) {
        const type = await prisma.vehicleType.upsert({
            where: { name: vehicleType },
            update: {},
            create: {
                name: vehicleType,
            },
        });
        console.log(`Created/Updated vehicle type: ${type.name}`);
    }

    for (const material of PRE_MATERIALS) {
        const preMaterial = await prisma.preMaterial.upsert({
            where: { name: material },
            update: {},
            create: {
                name: material,
            },
        });
        console.log(`Created/Updated pre material: ${preMaterial.name}`);
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
