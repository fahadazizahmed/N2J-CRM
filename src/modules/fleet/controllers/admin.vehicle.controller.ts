import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminVehicleService from '../services/admin.vehicle.service';

export default class AdminVehicleController {

    private adminVehicleService = new AdminVehicleService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/vehicle/add-vehicle
    createVehicle = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicle = await this.adminVehicleService.createVehicle(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Vehicle'), 201, vehicle);
        } catch (e: any) { throw new GenericError(e, `Error in createVehicle ${__filename}`); }
    };

    // PUT /api/v1/admin/vehicle/update-vehicle/:id
    updateVehicle = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicle = await this.adminVehicleService.updateVehicle(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Vehicle'), 200, vehicle);
        } catch (e: any) { throw new GenericError(e, `Error in updateVehicle ${__filename}`); }
    };

    // POST /api/v1/admin/vehicle/upload-media/:id
    uploadMedia = async (req: Request, res: Response): Promise<void> => {
        try {

            if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
                sendSuccessResponse(res, "Media files are required.", 400);
                return;
            }

            const vehicleMedia = await this.adminVehicleService.uploadMedia(Number(req.params.id), req.files as Express.Multer.File[], this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Vehicle media'), 201, vehicleMedia);
        } catch (e: any) { throw new GenericError(e, `Error in uploadMedia ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/get-vehicles
    getVehicles = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getVehicles(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicles ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/get-basic-vehicles
    getAllActiveIdleVehicles = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getAllActiveIdleVehicles();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Basic Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getBasicVehicles ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/get-vehicles-with-driver-details
    getVehiclesWithDriverDetails = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getVehiclesWithDriverDetails();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicles with Drivers'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehiclesWithDriverDetails ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/get-vehicle-statuses
    getVehicleStatuses = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getVehicleStatuses();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle Statuses'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleStatuses ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/get-vehicle-types
    getVehicleTypes = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getVehicleTypes();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle Types'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleTypes ${__filename}`); }
    };

    assignDriver = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicleId = parseInt(req.params.id as string, 10);
            const updatedDriver = await this.adminVehicleService.assignDriver(vehicleId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Vehicle assignment'), 200, updatedDriver);
        } catch (e: any) { throw new GenericError(e, `Error in assignVehicle ${__filename}`); }
    };

}
