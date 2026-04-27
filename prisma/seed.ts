import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcrypt';

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

    console.log(`Start seeding client user...`);
    const password = 'nouman123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const noumanUser = await prisma.user.upsert({
        where: { email: 'nouman@gmail.com' },
        update: {
            password_hash: hashedPassword,
        },
        create: {
            email: 'nouman@gmail.com',
            name: 'Nouman',
            password_hash: hashedPassword,
            status: 1, // Active
            roles: {
                connect: { name: 'client' },
            },
        },
    });

    console.log(`User ${noumanUser.email} created/updated.`);

    const noumanClient = await prisma.client.upsert({
        where: { user_id: noumanUser.id },
        update: {},
        create: {
            user_id: noumanUser.id,
            client_code: 'CLI-0001',
            client_name: noumanUser.name || 'Nouman Client',
            status: 'active',
        },
    });

    console.log(`Client record for ${noumanUser.email} created/updated.`);

    // Add a test job for the client to verify portal UI
    const defaultMaterial = await prisma.preMaterial.findFirst({ where: { name: "Sand" } });
    if (defaultMaterial) {
        await prisma.job.upsert({
            where: { job_number: 'JOB-2024-TEST-001' },
            update: {},
            create: {
                job_number: 'JOB-2024-TEST-001',
                client_id: noumanClient.id,
                pick_up_address: '123 Fake Street, Sydney, NSW',
                entry_date: new Date(),
                delivery_date: new Date(new Date().getTime() + 86400000), // Tomorrow
                material_id: defaultMaterial.id,
                quantity: 20.5,
                quantity_unit: 'tonnes',
                rate: 55.0,
                billing_type: 'perTonne',
                priority: 'normal',
                status: 'inProgress',
                nja_contact_name: 'System Admin',
                nja_contact_phone: '555-0199',
                one_way_toll: 12.50,
                return_toll: 15.00,
                notes: 'This is an autoseeded test job to verify the client portal functionality.',
            }
        });
        console.log(`Test Job JOB-2024-TEST-001 created for Nouman Client.`);
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
