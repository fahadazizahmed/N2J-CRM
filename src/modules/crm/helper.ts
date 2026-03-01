
import { Prisma } from '@prisma/client';

export async function generateClientCode(
    tx: Prisma.TransactionClient
): Promise<string> {

    const prefix = 'NJA-CL';
    const year = new Date().getFullYear();

    let sequenceRow = await tx.clientSequence.findUnique({
        where: { year },
    });

    if (!sequenceRow) {
        sequenceRow = await tx.clientSequence.create({
            data: {
                year,
                last_no: 1,
            },
        });
    } else {
        sequenceRow = await tx.clientSequence.update({
            where: { year },
            data: {
                last_no: { increment: 1 }, // atomic increment
            },
        });
    }

    const sequence = String(sequenceRow.last_no).padStart(3, '0');

    return `${prefix}-${year}-${sequence}`;
}