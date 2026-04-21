import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import SharedFleetService from '../services/shared.fleet.service';

export default class AdminDriverController {

    private sharedFleetService = new SharedFleetService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    getAllActiveIdleVehicles = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.sharedFleetService.getAllActiveIdleVehicles();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Basic Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getBasicVehicles ${__filename}`); }
    };

    getAllActiveIdleVehiclesSubcontractor = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = parseInt(req.params.id as string, 10);
            const result = await this.sharedFleetService.getAllActiveIdleVehiclesSubcontractor(subcontractorId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Basic Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getBasicVehicles ${__filename}`); }
    };
    getAllActiveNotAssignVehiclesDrivers = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.sharedFleetService.getAllActiveNotAssignVehiclesDrivers();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Basic Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getBasicVehicles ${__filename}`); }
    };

    getAllActiveNotAssignVehiclesDriversSubcontractor = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = parseInt(req.params.id as string, 10);
            const result = await this.sharedFleetService.getAllActiveNotAssignVehiclesDriversSubcontractor(subcontractorId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Basic Vehicles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getBasicVehicles ${__filename}`); }
    };







    // GET /api/v1/admin/vehicle/get-vehicles-with-driver-details
    getVehiclesWithDriverDetails = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = req.query.subcontractorId ? parseInt(req.query.subcontractorId as string, 10) : undefined;
            const result = await this.sharedFleetService.getVehiclesWithDriverDetails(subcontractorId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicles with Drivers'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehiclesWithDriverDetails ${__filename}`); }
    };
    assignVehicle = async (req: Request, res: Response): Promise<void> => {
        try {
            const driverId = parseInt(req.params.id as string, 10);
            const updatedDriver = await this.sharedFleetService.assignVehicle(driverId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Vehicle assignment'), 200, updatedDriver);
        } catch (e: any) { throw new GenericError(e, `Error in assignVehicle ${__filename}`); }
    };

    getDriverWithVehicleDetails = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = req.query.subcontractorId ? parseInt(req.query.subcontractorId as string, 10) : undefined;
            const result = await this.sharedFleetService.getDriverWithVehicleDetails(subcontractorId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Drvier with vechiles'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehiclesWithDriverDetails ${__filename}`); }
    };

    assignDriver = async (req: Request, res: Response): Promise<void> => {
        try {
            const vehicleId = parseInt(req.params.id as string, 10);
            const updatedDriver = await this.sharedFleetService.assignDriver(vehicleId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Vehicle assignment'), 200, updatedDriver);
        } catch (e: any) { throw new GenericError(e, `Error in assignVehicle ${__filename}`); }
    };

    getVehicleWithJob = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = req.query.subcontractorId ? parseInt(req.query.subcontractorId as string, 10) : undefined;
            const result = await this.sharedFleetService.getVehicleWithJob(subcontractorId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Vehicle with Job'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getVehicleWithJob ${__filename}`); }
    };
}
