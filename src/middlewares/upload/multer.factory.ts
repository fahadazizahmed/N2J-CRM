import multer from "multer";
import { BadRequestError } from "../../errors/bad-request-error";

export const createUploader = ({
    storage,
    allowedMimeTypes,
    fileSize,
}: {
    storage: any;
    allowedMimeTypes: string[];
    fileSize: number;
}) => {
    return multer({
        storage,
        limits: { fileSize },
        fileFilter: (req, file, cb) => {
            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {

                cb(new BadRequestError("Invalid file type") as unknown as Error);
            }
        },
    });
};
