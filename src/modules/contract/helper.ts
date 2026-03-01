import { Prisma } from '@prisma/client';

export async function generateContractNumber(
    tx: Prisma.TransactionClient
): Promise<string> {

    const prefix = 'NJA';
    const year = new Date().getFullYear();

    // Find sequence row for current year
    let sequenceRow = await tx.contractSequence.findUnique({
        where: { year },
    });

    if (!sequenceRow) {
        // First contract for this year
        sequenceRow = await tx.contractSequence.create({
            data: {
                year,
                last_no: 1,
            },
        });
    } else {
        // Atomic increment
        sequenceRow = await tx.contractSequence.update({
            where: { year },
            data: {
                last_no: { increment: 1 },
            },
        });
    }

    const sequence = String(sequenceRow.last_no).padStart(3, '0');

    return `${prefix}-${year}-${sequence}`;
}


