
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import fs from "fs";
import { Prisma, SequenceEntity } from '../../generated/prisma';


interface GenerateCodeOptions {
    tx: Prisma.TransactionClient;
    entity: SequenceEntity;
    prefix: string;
}


export function isValidABN(abn: string): boolean {
    // Remove spaces
    const cleaned = abn.replace(/\s+/g, '');
    // Must be exactly 11 digits
    if (!/^\d{11}$/.test(cleaned)) {
        return false;
    }

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

    const digits = cleaned.split('').map(Number);

    // Subtract 1 from first digit
    digits[0] = digits[0] - 1;

    const total = digits.reduce((sum, digit, index) => {
        return sum + digit * weights[index];
    }, 0);

    return total % 89 === 0;
}


export function isValidPhone(phone: string, countryCode: CountryCode): boolean {
    const parsed = parsePhoneNumberFromString(phone, countryCode);
    // console.log("parsed", parsed, "phone", phone, "countryCode", countryCode, "vvv", parsed.isValid())
    return parsed ? parsed.isValid() : false;
}


export const deleteFile = (filePath?: string) => {
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error("File delete failed:", err);
    }
};

export const normalizeBlobName = (filePath: string): string => {
    return filePath.replace(/^uploads[\\/]/, "");
}

export async function generateEntityCode({
    tx,
    entity,
    prefix,
}: GenerateCodeOptions): Promise<string> {

    const year = new Date().getFullYear();

    let sequenceRow = await tx.entitySequence.findUnique({
        where: {
            entity_year: {
                entity,
                year,
            },
        },
    });

    if (!sequenceRow) {
        sequenceRow = await tx.entitySequence.create({
            data: {
                entity,
                year,
                last_no: 1,
            },
        });
    } else {
        sequenceRow = await tx.entitySequence.update({
            where: {
                entity_year: {
                    entity,
                    year,
                },
            },
            data: {
                last_no: { increment: 1 },
            },
        });
    }

    const sequence = String(sequenceRow.last_no).padStart(3, '0');

    return `${prefix}-${year}-${sequence}`;
}