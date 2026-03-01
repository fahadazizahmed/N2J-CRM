import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const diskStorage = (folderPath: string) => {
    return multer.diskStorage({
        destination: async (req, file, cb) => {
            const uploadDir = `./uploads/${folderPath}`;
            console.log("uploadDir", uploadDir)
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            cb(null, uploadDir);
        },

        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const randomId = crypto.randomBytes(8).toString("hex");
            const ext = path.extname(file.originalname);

            const filename = `${file.fieldname}_${timestamp}_${randomId}${ext}`;

            cb(null, filename);
        },
    });
};



