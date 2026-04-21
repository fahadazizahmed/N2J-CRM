import { diskStorage } from '../../middlewares/upload/storage';
import { createUploader } from '../../middlewares/upload/multer.factory';

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


export const uploadSubContractorDocs = createMediaUploader("subcontractor/docs").array("docs", 10);
