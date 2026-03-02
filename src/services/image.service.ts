import {
    BlobServiceClient,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    StorageSharedKeyCredential
} from "@azure/storage-blob";
import fs from "fs";
import { normalizeBlobName } from "../helper/helper.method";

export interface IImageService {
    upload: (fileName: string, customBlobName?: string) => Promise<any>

}

export class ImageService implements IImageService {

    accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    containerName = process.env.AZURE_STORAGE_CONTAINER;

    upload = async (fileName: string, customBlobName?: string): Promise<any> => {
        try {

            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING as string);
            const containerClient = blobServiceClient.getContainerClient(this.containerName as string);
            const blobName = customBlobName || normalizeBlobName(fileName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            let response = await blockBlobClient.uploadFile(fileName);
            this.cleanupTempFile(fileName);
            return response
        }
        catch (err) {
            this.cleanupTempFile(fileName);
            return false
        }
    }


    getImageUrl = async (blobName: string): Promise<string> => {
        try {
            const sharedKeyCredential = new StorageSharedKeyCredential(
                this.accountName,
                this.accountKey
            );

            const sasToken = generateBlobSASQueryParameters(
                {
                    containerName: this.containerName,
                    blobName: blobName,
                    permissions: BlobSASPermissions.parse("r"),
                    expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                },
                sharedKeyCredential
            ).toString();

            return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sasToken}`;

        } catch (err) {
            console.error("SAS generation error:", err);
            throw err;
        }
    };

    cleanupTempFile(file: string) {

        try {
            fs.unlinkSync(file);
            console.log(`🗑️ Cleaned up temp file: ${file}`);
        } catch (error) {
            console.error('Error cleaning up temp file:', error);
        }

    }


}
