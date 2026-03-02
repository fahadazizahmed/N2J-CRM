import { Prisma } from '@prisma/client';
import { diskStorage } from '../../middlewares/upload/storage';
import { createUploader } from '../../middlewares/upload/multer.factory';

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



const createDocUploader = (folder: string) =>
    createUploader({
        storage: diskStorage(folder),
        allowedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/png",
            "image/jpg",
            "image/jpeg",
        ],
        fileSize: 10 * 1024 * 1024, // 10MB
    });

export const uploadContractDocs = createDocUploader("contracts/docs").single("docs");








