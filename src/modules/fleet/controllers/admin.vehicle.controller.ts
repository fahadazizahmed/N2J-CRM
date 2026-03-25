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


    uploadMedia = async (req: Request, res: Response): Promise<void> => {
        try {
            const files = req.files ? (req.files as Express.Multer.File[]) : [];

            const vehicleId = parseInt(req.params.id as string, 10);
            const documentType = req.body.documentType as any;
            const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

            const docs = await this.adminVehicleService.uploadMedia(
                vehicleId,
                documentType,
                expiryDate,
                files,
                this.actorId(req)
            );
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Vehicle documents'), 201, docs);
        } catch (e: any) { throw new GenericError(e, `Error in uploadDocs ${__filename}`); }
    };


    // GET /api/v1/admin/vehicle/get-vehicles
    getVehicles = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminVehicleService.getVehicles(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicles ${__filename}`); }
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



    getVehicleById = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicleId = parseInt(req.params.id as string, 10);
            const vehicle = await this.adminVehicleService.getVehicleById(vehicleId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle'), 200, vehicle);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleById ${__filename}`); }
    };

    getVehicleDocs = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicleId = parseInt(req.params.id as string, 10);
            const vehicle = await this.adminVehicleService.getVehicleDocs(vehicleId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle docs'), 200, vehicle);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleDocs ${__filename}`); }
    };

    // GET /api/v1/admin/vehicle/stats
    getVehicleStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.adminVehicleService.getVehicleStats();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle stats'), 200, stats);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleStats ${__filename}`); }
    };
}
