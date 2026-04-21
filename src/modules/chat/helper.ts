// import { Prisma } from '@prisma/client';
import { diskStorage } from '../../middlewares/upload/storage';
import { createUploader } from '../../middlewares/upload/multer.factory';

// export async function generateContractNumber(
//     tx: Prisma.TransactionClient
// ): Promise<string> {

//     const prefix = 'NJA';
//     const year = new Date().getFullYear();

//     // Find sequence row for current year
//     let sequenceRow = await tx.contractSequence.findUnique({
//         where: { year },
//     });

//     if (!sequenceRow) {
//         // First contract for this year
//         sequenceRow = await tx.contractSequence.create({
//             data: {
//                 year,
//                 last_no: 1,
//             },
//         });
//     } else {
//         // Atomic increment
//         sequenceRow = await tx.contractSequence.update({
//             where: { year },
//             data: {
//                 last_no: { increment: 1 },
//             },
//         });
//     }

//     const sequence = String(sequenceRow.last_no).padStart(3, '0');

//     return `${prefix}-${year}-${sequence}`;
// }


const createMediaUploader = (folder: string) =>
    createUploader({
        storage: diskStorage(folder),
        allowedMimeTypes: [
            "image/png",
            "image/jpg",
            "image/jpeg",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        fileSize: 10 * 1024 * 1024, // 10MB
    });

export const uploadDispatchDocs = createMediaUploader("job/docs").array("docs", 10);
// export const uploadContractDocs = createDocUploader("contracts/docs").single("docs");

// export const toDateOnly = (date: any) => {
//     return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
// }

// // ─── Helper: subOneDayUTC ───────────────────────────────────────────────────

// export const subOneDay = (date: any) => {
//     const d = new Date(date);
//     d.setUTCDate(d.getUTCDate() - 1);
//     return d;
// }














