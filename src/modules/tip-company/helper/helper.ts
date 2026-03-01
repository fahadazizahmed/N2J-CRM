//one image upload
// import { diskStorage } from "../../../middlewares/upload/storage";
// import { createUploader } from "../../../middlewares/upload/multer.factory";

// const tipsDocsUploader = createUploader({
//     storage: diskStorage("temp/course/thumbnail"),
//     allowedMimeTypes: [
//         "image/png",
//         "image/jpg",
//         "image/jpeg",
//     ],
//     fileSize: 5 * 1024 * 1024,
// });

// export const tipsDocsUpload = tipsDocsUploader.single("tip-docs");





//multiple image upload
// import { diskStorage } from "../../../middlewares/upload/storage";
// import { createUploader } from "../../../middlewares/upload/multer.factory";

// const tipsUploader = createUploader({
//   storage: diskStorage("temp/course/thumbnail"),
//   allowedMimeTypes: [
//     "image/png",
//     "image/jpg",
//     "image/jpeg",
//   ],
//   fileSize: 5 * 1024 * 1024,
// });

// export const tipsUpload = tipsUploader.fields([
//   { name: "tip-docs", maxCount: 1 },
//   { name: "tips-image", maxCount: 1 },
//   { name: "extra-image", maxCount: 1 },
//   { name: "banner", maxCount: 1 },
// ]);



//For image which has different path

import { diskStorage } from "../../../middlewares/upload/storage";
import { createUploader } from "../../../middlewares/upload/multer.factory";

const createImageUploader = (folder: string) =>
    createUploader({
        storage: diskStorage(folder),
        allowedMimeTypes: [
            "image/png",
            "image/jpg",
            "image/jpeg",
        ],
        fileSize: 5 * 1024 * 1024,
    });


export const uploadBanner = createImageUploader("tips/banner").single("banner");

export const uploadProfile = createImageUploader("tips/profile").single("profile");

export const uploadLogo = createImageUploader("tips/logo").single("logo");

export const uploadCover = createImageUploader("tips/cover").single("cover");