import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminDriverService from '../services/admin.driver.service';

export default class AdminDriverController {

    private adminDriverService = new AdminDriverService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/driver/add-driver
    createDriver = async (req: Request, res: Response): Promise<void> => {
        try {
            const driver = await this.adminDriverService.createDriver(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Driver'), 201, driver);
        } catch (e: any) { throw new GenericError(e, `Error in createDriver ${__filename}`); }
    };

    // PUT /api/v1/admin/fleet/driver/update-driver/:id
    updateDriver = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const driver = await this.adminDriverService.updateDriver(id, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Driver'), 200, driver);
        } catch (e: any) { throw new GenericError(e, `Error in updateDriver ${__filename}`); }
    };

    // POST /api/v1/admin/fleet/driver/add-driver-rates/:id
    addDriverRates = async (req: Request, res: Response): Promise<void> => {
        try {
            const driverId = parseInt(req.params.id as string, 10);
            const rates = await this.adminDriverService.addDriverRates(driverId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Driver rates'), 201, rates);
        } catch (e: any) { throw new GenericError(e, `Error in addDriverRates ${__filename}`); }
    };
    getDriverEnums = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminDriverService.getDriverEnums();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Driver enums'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleTypes ${__filename}`); }
    };

    // GET /api/v1/admin/fleet/driver/get-driver/:id
    getDriverById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const driver = await this.adminDriverService.getDriverById(id, req);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Driver'), 200, driver);
        } catch (e: any) { throw new GenericError(e, `Error in getDriverById ${__filename}`); }
    };

    // GET /api/v1/admin/fleet/driver/get-drivers
    getDrivers = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = req.query;
            if (query.page) query.page = parseInt(query.page as string, 10) as any;
            if (query.limit) query.limit = parseInt(query.limit as string, 10) as any;

            const result = await this.adminDriverService.getDrivers(query);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Drivers'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getDrivers ${__filename}`); }
    };

    // POST /api/v1/admin/fleet/driver/upload-docs/:id
    uploadDocs = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
                sendSuccessResponse(res, "Document files are required.", 400);
                return;
            }

            const driverId = parseInt(req.params.id as string, 10);
            const documentType = req.body.documentType as any;
            const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

            const docs = await this.adminDriverService.uploadDocs(
                driverId,
                documentType,
                expiryDate,
                req.files as Express.Multer.File[],
                this.actorId(req)
            );
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Driver documents'), 201, docs);
        } catch (e: any) { throw new GenericError(e, `Error in uploadDocs ${__filename}`); }
    };

    // POST /api/v1/admin/fleet/driver/assign-vehicle/:id
    assignVehicle = async (req: Request, res: Response): Promise<void> => {
        try {
            const driverId = parseInt(req.params.id as string, 10);
            const updatedDriver = await this.adminDriverService.assignVehicle(driverId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Vehicle assignment'), 200, updatedDriver);
        } catch (e: any) { throw new GenericError(e, `Error in assignVehicle ${__filename}`); }
    };
}
