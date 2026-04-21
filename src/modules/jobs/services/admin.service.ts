import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ClientStatus, ContractStatus, SequenceEntity, Prisma, ContractType, TollHandling, JobStatus, JobPriority, VehicleStatus, DriverStatus, JobAssignmentStatus, DriverDocumentType, VehicleCategory, DriverType, JobDocumentType, SubcontractorStatus } from '../../../../generated/prisma';
import { ImageService } from '../../../services/image.service';
import { generateEntityCode } from '../../../helper/helper.method';
import { ICreateJobDTO, IGetJobsQuery, IUpdateJobDTO, IUpdateJobStatusDTO, IUpsertDispatchDTO } from '../dto/job.dto';
import { UnProcessableEntityError } from '../../../errors';
import { activityService } from '../../../services/activity.service';




export interface IAdminJobService {
    createJob(dto: ICreateJobDTO, actorId: number | null): Promise<any>;
    updateJob(id: number, dto: IUpdateJobDTO, actorId: number | null): Promise<any>;
    updateJobStatus(id: number, dto: IUpdateJobStatusDTO, actorId: number | null): Promise<any>;
    upsertDispatch(id: number, dto: IUpsertDispatchDTO, actorId: number | null): Promise<any>;
    getJobById(id: number): Promise<any>;
    getJobs(query: IGetJobsQuery): Promise<any>;
    getJobStats(): Promise<any>;
    getPreMaterials(): Promise<any[]>;
    uploadDispatchDocs(jobId: number, documentType: JobDocumentType, files: Express.Multer.File[], documentName?: string, actorId?: number | null): Promise<any>;
    getJobLogs(jobId: number): Promise<any[]>;
}

export default class AdminJobService implements IAdminJobService {
    private imageService = new ImageService();

    public async createJob(
        dto: ICreateJobDTO,
        actorId: number | null
    ): Promise<any> {

        const {
            clientId,
            tipId,
            contractId,
            vehicles,
            pickUpAddress,
            entryDate,
            deliveryDate,
            materialId,
            materialName,
            quantity,
            quantityUnit,
            rate,
            billingType,
            tollHandling,
            oneWayToll,
            returnToll,
            tipAddress,
            tipRate,
            tipBillingType,
            notes,
            priority,

        } = dto;

        const clientExist = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!clientExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Client'));
        if (clientExist.status !== ClientStatus.active) {
            throw new UnProcessableEntityError("Client is not active");
        }

        // Optional contract: validate existence, type, ownership, and status
        if (contractId) {
            const contractExist = await prisma.clientContract.findUnique({
                where: { id: contractId },
            });
            if (!contractExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
            if (contractExist.contract_type !== ContractType.client) {
                throw new BadRequestError(`The provided contractId does not refer to a client contract.`);
            }
            if (contractExist.client_id !== clientId) {
                throw new BadRequestError(`Contract does not belong to this client.`);
            }
            if (contractExist.status !== ContractStatus.active) {
                throw new UnProcessableEntityError(`Contract is not active.`);
            }
        }

        if (tipId) {
            const tipExist = await prisma.clientContract.findUnique({
                where: { id: tipId },
            });
            if (!tipExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Tip'));
            if (tipExist.contract_type !== ContractType.supplier) {
                throw new BadRequestError(`The provided tipId does not refer to a supplier contract.`);
            }
            if (tipExist.status !== ContractStatus.active) {
                throw new UnProcessableEntityError("Tip contract is not active.");
            }
        }
        if (!vehicles || vehicles.length === 0) {
            throw new BadRequestError("At least one vehicle must be assigned to the job.");
        }

        const invalidVehicle = vehicles.find(v => !v.driverId);

        if (invalidVehicle) {
            throw new BadRequestError(`Vehicle ${invalidVehicle.vehicleId} must have an assigned driver. A vehicle without a driver is logically not allowed.`);
        }

        const vehicleIds = vehicles.map(v => v.vehicleId);
        const driverIds = vehicles.map(v => v.driverId as number);

        // ── Intra-request duplicate checks (before any DB calls) ─────────────
        const duplicateVehicleId = vehicleIds.find((id, i) => vehicleIds.indexOf(id) !== i);
        if (duplicateVehicleId) {
            throw new BadRequestError(`Vehicle ID ${duplicateVehicleId} appears more than once in the request. Each vehicle can only be assigned once per job.`);
        }

        const duplicateDriverId = driverIds.find((id, i) => driverIds.indexOf(id) !== i);
        if (duplicateDriverId) {
            throw new BadRequestError(`Driver ID ${duplicateDriverId} appears more than once in the request. A driver can only be assigned to one vehicle per job.`);
        }

        const vehiclesExist = await prisma.vehicle.findMany({
            where: { id: { in: vehicleIds } },
        });
        if (vehiclesExist.length !== vehicleIds.length) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('One or more Vehicles'));


        for (const vehicle of vehiclesExist) {
            if (vehicle.status === VehicleStatus.outOfService || vehicle.status === VehicleStatus.maintenance) {
                throw new UnProcessableEntityError(`Can't assign ${vehicle.registration_number} to job because it is ${vehicle.status}`);
            }
        }

        let vehicleJobExist = await prisma.job.findFirst({
            where: {
                assignments: {
                    some: {
                        vehicle_id: { in: vehicleIds }
                    }
                },
                status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                OR: [
                    {
                        entry_date: { lt: new Date(deliveryDate) },
                        delivery_date: { gt: new Date(entryDate) },
                    }
                ]
            },
            include: {
                assignments: true
            }
        })

        if (vehicleJobExist) {
            const assignedVehicleId = vehicleJobExist.assignments.find(a => vehicleIds.includes(a.vehicle_id))?.vehicle_id;
            const overlappingVehicle = vehiclesExist.find(v => v.id === assignedVehicleId);
            throw new UnProcessableEntityError(`Vehicle ${overlappingVehicle?.registration_number || assignedVehicleId} is already assigned to another job during this time.`);
        }

        // ── Driver Validations ────────────────────────────────────────────────
        const driversExist = await prisma.driver.findMany({
            where: { id: { in: driverIds } },
        });

        // 1. All drivers must exist
        if (driversExist.length !== driverIds.length) {
            const foundIds = driversExist.map(d => d.id);
            const missingId = driverIds.find(id => !foundIds.includes(id));
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND(`Driver ${missingId}`));
        }

        for (const driver of driversExist) {
            if (driver.status !== DriverStatus.active && driver.status !== DriverStatus.idle) {
                throw new UnProcessableEntityError(`Driver ${driver.first_name} ${driver.last_name} cannot be assigned because their status is '${driver.status}'.`);
            }
        }

        // ── Cross-Validation (Subcontractor match) ────────────────────────────
        for (const item of vehicles) {
            const vehicle = vehiclesExist.find(v => v.id === item.vehicleId);
            const driver = driversExist.find(d => d.id === item.driverId);

            if (vehicle && driver) {
                if (vehicle.vehicle_category === VehicleCategory.subcontractor) {
                    if (!vehicle.subcontractor_id) {
                        throw new BadRequestError(`Vehicle ${vehicle.registration_number || vehicle.id} is missing subcontractor association.`);
                    }
                    if (driver.subcontractor_id !== vehicle.subcontractor_id) {
                        throw new BadRequestError(`Driver ${driver.first_name} ${driver.last_name} does not belong to the same subcontractor as vehicle ${vehicle.registration_number || vehicle.id}.`);
                    }
                } else {

                    if (driver.subcontractor_id) {
                        throw new BadRequestError(`In-house vehicle ${vehicle.registration_number || vehicle.id} cannot be assigned to subcontractor driver ${driver.first_name} ${driver.last_name}.`);
                    }
                }
            }
        }
        // ── Create Job + Assignments in a Serializable transaction ───────────
        // All overlap/double-booking checks run INSIDE the transaction so that
        // concurrent requests cannot both pass the checks and both write —
        // PostgreSQL will abort one of them if they conflict.
        const job = await prisma.$transaction(async (tx) => {

            // ── Re-check vehicle overlap inside tx (race condition guard) ─────
            const vehicleConflict = await tx.job.findFirst({
                where: {
                    assignments: { some: { vehicle_id: { in: vehicleIds } } },
                    status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                    OR: [
                        {
                            entry_date: { lt: new Date(deliveryDate) },
                            delivery_date: { gt: new Date(entryDate) },
                        }
                    ]
                },
                include: { assignments: true }
            });

            if (vehicleConflict) {
                const vid = vehicleConflict.assignments.find(a => vehicleIds.includes(a.vehicle_id))?.vehicle_id;
                const veh = vehiclesExist.find(v => v.id === vid);
                throw new UnProcessableEntityError(
                    `Vehicle ${veh?.registration_number || vid} is already assigned to another job during this time.`
                );
            }

            // ── Re-check driver overlap inside tx (race condition guard) ──────
            const driverConflict = await tx.job.findFirst({
                where: {
                    assignments: { some: { driver_id: { in: driverIds } } },
                    status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                    OR: [
                        {
                            entry_date: { lt: new Date(deliveryDate) },
                            delivery_date: { gt: new Date(entryDate) },
                        }
                    ]
                },
                include: { assignments: true }
            });
            if (driverConflict) {
                const did = driverConflict.assignments.find(a => driverIds.includes(a.driver_id))?.driver_id;
                const drv = driversExist.find(d => d.id === did);
                throw new UnProcessableEntityError(
                    `Driver ${drv ? `${drv.first_name} ${drv.last_name}` : did} is already assigned to another job during this time.`
                );
            }

            // 1. Generate unique job number
            const jobNumber = await generateEntityCode({
                tx,
                entity: SequenceEntity.JOB,
                prefix: constant.CODE_PREFIX.JOB,
            });

            // ── Material check / creation ────────
            let finalMaterialId: number;
            if (materialId) {
                const preMaterial = await tx.preMaterial.findUnique({
                    where: { id: materialId }
                });
                if (!preMaterial) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Material Type"));
                }
                finalMaterialId = preMaterial.id;
            } else if (materialName) {
                let preMaterial = await tx.preMaterial.findFirst({
                    where: { name: { equals: materialName, mode: 'insensitive' } }
                });
                if (!preMaterial) {
                    preMaterial = await tx.preMaterial.create({ data: { name: materialName } });
                }
                finalMaterialId = preMaterial.id;
            } else {
                throw new BadRequestError('Either materialId or materialName must be provided');
            }

            const newJob = await tx.job.create({
                data: {
                    job_number: jobNumber,
                    client_id: clientId,
                    contract_id: contractId ?? null,
                    tip_id: tipId ?? null,
                    tip_address: tipAddress ?? null,
                    tip_rate: tipRate ?? null,
                    tip_billing_type: tipBillingType ?? null,
                    pick_up_address: pickUpAddress,
                    entry_date: new Date(entryDate),
                    delivery_date: new Date(deliveryDate),
                    material_id: finalMaterialId,
                    quantity,
                    quantity_unit: quantityUnit,
                    rate,
                    billing_type: billingType,
                    toll_handling: tollHandling || TollHandling.passThrough,
                    one_way_toll: oneWayToll ?? null,
                    return_toll: returnToll ?? null,
                    notes: notes ?? null,
                    priority,
                    status: JobStatus.scheduled,
                    created_by: actorId,
                },
            });

            // 3. Create one JobAssignment per vehicle/driver pair
            await tx.jobAssignment.createMany({
                data: vehicles.map((v) => ({
                    job_id: newJob.id,
                    vehicle_id: v.vehicleId,
                    driver_id: v.driverId as number,
                    status: JobAssignmentStatus.assigned,
                })),
            });

            return newJob;
        }, {
            maxWait: constant.TX_MAX_WAIT,
            timeout: constant.TX_TIMEOUT,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        // ── Audit log (fire-and-forget) ───────────────────────────────────────
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: job.id,
            metadata: {
                job_number: job.job_number,
                client_id: job.client_id,
                vehicle_count: vehicles.length,
            },
        });

        activityService.log({
            actor_id: actorId,
            action: "created",
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: job.id,
            message: `Job ${job.job_number} created`,
        });

        return job;

    }

    public async updateJob(id: number, dto: IUpdateJobDTO, actorId: number | null): Promise<any> {

        const existingJob = await prisma.job.findUnique({ where: { id } });
        if (!existingJob) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));

        const updateData: any = {};

        if (dto.clientId !== undefined) {
            const clientExist = await prisma.client.findUnique({ where: { id: dto.clientId } });
            if (!clientExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Client'));
            if (clientExist.status !== ClientStatus.active) {
                throw new UnProcessableEntityError("Client is not active");
            }
            updateData.client_id = dto.clientId;
        }

        if (dto.contractId !== undefined) {
            if (dto.contractId) {
                const contractExist = await prisma.clientContract.findUnique({ where: { id: dto.contractId } });
                if (!contractExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
                if (contractExist.contract_type !== ContractType.client) {
                    throw new BadRequestError(`The provided contractId does not refer to a client contract.`);
                }
                const clientIdToCheck = dto.clientId ?? existingJob.client_id;
                if (contractExist.client_id !== clientIdToCheck) {
                    throw new BadRequestError(`Contract does not belong to this client.`);
                }
                if (contractExist.status !== ContractStatus.active) {
                    throw new UnProcessableEntityError(`Contract is not active.`);
                }
            }
            updateData.contract_id = dto.contractId;
        }

        if (dto.tipId !== undefined) {
            if (dto.tipId) {
                const tipExist = await prisma.clientContract.findUnique({ where: { id: dto.tipId } });
                if (!tipExist) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Tip'));
                if (tipExist.contract_type !== ContractType.supplier) {
                    throw new BadRequestError(`The provided tipId does not refer to a supplier contract.`);
                }
                if (tipExist.status !== ContractStatus.active) {
                    throw new UnProcessableEntityError("Tip contract is not active.");
                }
            }
            updateData.tip_id = dto.tipId;
        }

        if (dto.tipAddress !== undefined) updateData.tip_address = dto.tipAddress;
        if (dto.tipRate !== undefined) updateData.tip_rate = dto.tipRate;
        if (dto.tipBillingType !== undefined) updateData.tip_billing_type = dto.tipBillingType;
        if (dto.pickUpAddress !== undefined) updateData.pick_up_address = dto.pickUpAddress;
        if (dto.entryDate !== undefined) updateData.entry_date = new Date(dto.entryDate);
        if (dto.deliveryDate !== undefined) updateData.delivery_date = new Date(dto.deliveryDate);
        if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
        if (dto.quantityUnit !== undefined) updateData.quantity_unit = dto.quantityUnit;
        if (dto.rate !== undefined) updateData.rate = dto.rate;
        if (dto.billingType !== undefined) updateData.billing_type = dto.billingType;
        if (dto.tollHandling !== undefined) updateData.toll_handling = dto.tollHandling;
        if (dto.oneWayToll !== undefined) updateData.one_way_toll = dto.oneWayToll;
        if (dto.returnToll !== undefined) updateData.return_toll = dto.returnToll;

        if (dto.notes !== undefined) updateData.notes = dto.notes;
        if (dto.priority !== undefined) updateData.priority = dto.priority;
        if (dto.status !== undefined) updateData.status = dto.status;

        const effectiveEntryDate = updateData.entry_date || existingJob.entry_date;
        const effectiveDeliveryDate = updateData.delivery_date || existingJob.delivery_date;

        let vehiclesExist: any[] = [];
        let driversExist: any[] = [];
        let vehicleIds: number[] = [];
        let driverIds: number[] = [];

        if (dto.vehicles && dto.vehicles.length > 0) {
            const invalidVehicle = dto.vehicles.find(v => !v.driverId);
            if (invalidVehicle) {
                throw new BadRequestError(`Vehicle ${invalidVehicle.vehicleId} must have an assigned driver. A vehicle without a driver is logically not allowed.`);
            }

            vehicleIds = dto.vehicles.map(v => v.vehicleId);
            driverIds = dto.vehicles.map(v => v.driverId as number);

            const duplicateVehicleId = vehicleIds.find((id, i) => vehicleIds.indexOf(id) !== i);
            if (duplicateVehicleId) {
                throw new BadRequestError(`Vehicle ID ${duplicateVehicleId} appears more than once in the request. Each vehicle can only be assigned once per job.`);
            }

            const duplicateDriverId = driverIds.find((id, i) => driverIds.indexOf(id) !== i);
            if (duplicateDriverId) {
                throw new BadRequestError(`Driver ID ${duplicateDriverId} appears more than once in the request. A driver can only be assigned to one vehicle per job.`);
            }

            vehiclesExist = await prisma.vehicle.findMany({ where: { id: { in: vehicleIds } } });
            if (vehiclesExist.length !== vehicleIds.length) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('One or more Vehicles'));

            for (const vehicle of vehiclesExist) {
                if (vehicle.status === VehicleStatus.outOfService || vehicle.status === VehicleStatus.maintenance) {
                    throw new UnProcessableEntityError(`Can't assign ${vehicle.registration_number} to job because it is ${vehicle.status}`);
                }
            }

            const vehicleJobExist = await prisma.job.findFirst({
                where: {
                    id: { not: existingJob.id },
                    assignments: { some: { vehicle_id: { in: vehicleIds } } },
                    status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                    OR: [
                        { entry_date: { lt: new Date(effectiveDeliveryDate) }, delivery_date: { gt: new Date(effectiveEntryDate) } }
                    ]
                },
                include: { assignments: true }
            });

            if (vehicleJobExist) {
                const assignedVehicleId = vehicleJobExist.assignments.find(a => vehicleIds.includes(a.vehicle_id))?.vehicle_id;
                const overlappingVehicle = vehiclesExist.find(v => v.id === assignedVehicleId);
                throw new UnProcessableEntityError(`Vehicle ${overlappingVehicle?.registration_number || assignedVehicleId} is already assigned to another job during this time.`);
            }

            // ── Driver Validations ────────────────────────────────────────────
            driversExist = await prisma.driver.findMany({ where: { id: { in: driverIds } } });
            if (driversExist.length !== driverIds.length) {
                const foundIds = driversExist.map(d => d.id);
                const missingId = driverIds.find(id => !foundIds.includes(id));
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND(`Driver ${missingId}`));
            }

            for (const driver of driversExist) {
                if (driver.status !== DriverStatus.active && driver.status !== DriverStatus.idle) {
                    throw new UnProcessableEntityError(`Driver ${driver.first_name} ${driver.last_name} cannot be assigned because their status is '${driver.status}'.`);
                }
            }

            // ── Driver overlap pre-check ──────────────────────────────────────
            const driverJobExist = await prisma.job.findFirst({
                where: {
                    id: { not: existingJob.id },
                    assignments: { some: { driver_id: { in: driverIds } } },
                    status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                    OR: [
                        { entry_date: { lt: new Date(effectiveDeliveryDate) }, delivery_date: { gt: new Date(effectiveEntryDate) } }
                    ]
                },
                include: { assignments: true }
            });

            if (driverJobExist) {
                const assignedDriverId = driverJobExist.assignments.find(a => driverIds.includes(a.driver_id))?.driver_id;
                const overlappingDriver = driversExist.find(d => d.id === assignedDriverId);
                throw new UnProcessableEntityError(`Driver ${overlappingDriver ? `${overlappingDriver.first_name} ${overlappingDriver.last_name}` : assignedDriverId} is already assigned to another job during this time.`);
            }

            // ── Cross-Validation (Subcontractor match) ────────────────────────
            for (const item of dto.vehicles) {
                const vehicle = vehiclesExist.find(v => v.id === item.vehicleId);
                const driver = driversExist.find(d => d.id === item.driverId);

                if (vehicle && driver) {
                    if (vehicle.vehicle_category === VehicleCategory.subcontractor) {
                        if (!vehicle.subcontractor_id) {
                            throw new BadRequestError(`Vehicle ${vehicle.registration_number || vehicle.id} is missing subcontractor association.`);
                        }
                        if (driver.subcontractor_id !== vehicle.subcontractor_id) {
                            throw new BadRequestError(`Driver ${driver.first_name} ${driver.last_name} does not belong to the same subcontractor as vehicle ${vehicle.registration_number || vehicle.id}.`);
                        }
                    } else {
                        if (driver.subcontractor_id) {
                            throw new BadRequestError(`In-house vehicle ${vehicle.registration_number || vehicle.id} cannot be assigned to subcontractor driver ${driver.first_name} ${driver.last_name}.`);
                        }
                    }
                }
            }
        }

        const updatedJob = await prisma.$transaction(async (tx) => {
            if (dto.vehicles && dto.vehicles.length > 0) {
                const vehicleConflict = await tx.job.findFirst({
                    where: {
                        id: { not: existingJob.id },
                        assignments: { some: { vehicle_id: { in: vehicleIds } } },
                        status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                        OR: [
                            { entry_date: { lt: new Date(effectiveDeliveryDate) }, delivery_date: { gt: new Date(effectiveEntryDate) } }
                        ]
                    },
                    include: { assignments: true }
                });
                if (vehicleConflict) {

                    const vid = vehicleConflict.assignments.find(a => vehicleIds.includes(a.vehicle_id))?.vehicle_id;
                    const veh = vehiclesExist.find(v => v.id === vid);

                    throw new UnProcessableEntityError(
                        `Vehicless ${veh?.registration_number || vid} is already assigned to another job during this time.`
                    );
                }

                const driverConflict = await tx.job.findFirst({
                    where: {
                        id: { not: existingJob.id },
                        assignments: { some: { driver_id: { in: driverIds } } },
                        status: { in: [JobStatus.scheduled, JobStatus.inProgress] },
                        OR: [
                            { entry_date: { lt: new Date(effectiveDeliveryDate) }, delivery_date: { gt: new Date(effectiveEntryDate) } }
                        ]
                    },
                    include: { assignments: true }
                });
                if (driverConflict) {
                    const did = driverConflict.assignments.find(a => driverIds.includes(a.driver_id))?.driver_id;
                    const drv = driversExist.find(d => d.id === did);
                    throw new UnProcessableEntityError(
                        `Driver ${drv ? `${drv.first_name} ${drv.last_name}` : did} is already assigned to another job during this time.`
                    );
                }

                await tx.jobAssignment.deleteMany({ where: { job_id: id } });

                await tx.jobAssignment.createMany({
                    data: dto.vehicles.map((v) => ({
                        job_id: id,
                        vehicle_id: v.vehicleId,
                        driver_id: v.driverId as number,
                        status: JobAssignmentStatus.assigned,
                    })),
                });
            }


            if (dto.materialId !== undefined || dto.materialName !== undefined) {
                let finalMaterialId: number | undefined;
                if (dto.materialId) {
                    const preMaterial = await tx.preMaterial.findUnique({
                        where: { id: dto.materialId }
                    });
                    if (!preMaterial) {
                        throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Material Type"));
                    }
                    finalMaterialId = preMaterial.id;
                } else if (dto.materialName) {
                    let preMaterial = await tx.preMaterial.findFirst({
                        where: { name: { equals: dto.materialName, mode: 'insensitive' } }
                    });
                    if (!preMaterial) {
                        preMaterial = await tx.preMaterial.create({ data: { name: dto.materialName } });
                    }
                    finalMaterialId = preMaterial.id;
                }
                if (finalMaterialId) {
                    updateData.material_id = finalMaterialId;
                }
            }

            return tx.job.update({
                where: { id },
                data: updateData,
            });
        }, {
            maxWait: constant.TX_MAX_WAIT,
            timeout: constant.TX_TIMEOUT,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: (constant.ENTITY_TYPE as any).JOB || 'JOB',
            entity_id: updatedJob.id,
            metadata: {
                job_number: updatedJob.job_number,
                action: 'Job updated successfully'
            },
        });

        return updatedJob;
    }

    public async updateJobStatus(id: number, dto: IUpdateJobStatusDTO, actorId: number | null): Promise<any> {
        const existingJob = await prisma.job.findUnique({ where: { id } });
        if (!existingJob) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));

        const updatedJob = await prisma.job.update({
            where: { id },
            data: { status: dto.status }
        });

        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: (constant.ENTITY_TYPE as any).JOB || 'JOB',
            entity_id: updatedJob.id,
            metadata: {
                job_number: updatedJob.job_number,
                previous_status: existingJob.status,
                new_status: dto.status,
                action: 'Job status updated successfully'
            },
        });

        activityService.log({
            actor_id: actorId,
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: updatedJob.id,
            action: "status_changed", // optional but useful
            message: `Job status changed from ${existingJob.status} → ${dto.status}`,
        });

        return updatedJob;
    }

    public async upsertDispatch(
        id: number,
        dto: IUpsertDispatchDTO,
        actorId: number | null
    ): Promise<any> {

        const existingJob = await prisma.job.findUnique({
            where: { id }
        });

        if (!existingJob) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));
        }

        // ❌ Prevent dispatch on completed/cancelled jobs (important)
        if (existingJob.status === JobStatus.completed || existingJob.status === JobStatus.cancelled) {
            throw new BadRequestError('Cannot dispatch a completed or cancelled job');
        }

        const isFirstDispatch = !existingJob.dispatch_created_at;

        // ✅ Build update object safely (ONLY update provided fields)
        const updateData: any = {
            ...(dto.stagingLocation !== undefined && {
                staging_location: dto.stagingLocation
            }),

            ...(dto.loadingTime && {
                loading_time: new Date(dto.loadingTime)
            }),

            ...(dto.trucksLoadingAtOnce !== undefined && {
                trucks_loading_at_once: dto.trucksLoadingAtOnce
            }),

            ...(dto.njaContactName !== undefined && {
                nja_contact_name: dto.njaContactName
            }),

            ...(dto.njaContactPhone !== undefined && {
                nja_contact_phone: dto.njaContactPhone
            }),

            ...(dto.loadingInstruction !== undefined && {
                loading_instruction: dto.loadingInstruction
            }),

            ...(dto.additionalInformation !== undefined && {
                additional_information: dto.additionalInformation
            }),

            ...(dto.ppeRequirements !== undefined && {
                ppe_requirements: dto.ppeRequirements
            }),
        };

        // ✅ First-time dispatch logic
        if (isFirstDispatch) {
            updateData.dispatch_created_at = new Date();
            updateData.status = JobStatus.dispatched; // 🔥 important
        }

        const updatedJob = await prisma.job.update({
            where: { id },
            data: updateData,
        });

        // ── Audit log (simple — just records the action) ─────────────────────
        auditService.logWithRetry({
            actor_id: actorId,
            action: isFirstDispatch
                ? constant.AUDIT_LOG_ACTION.CREATE
                : constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: updatedJob.id,
            metadata: {
                job_number: updatedJob.job_number,
                section: 'Dispatch Notice',
                action: isFirstDispatch ? 'Dispatch Notice created' : 'Dispatch Notice updated',
            },
        });

        // ── Activity log — rich "Field updated from X → Y" messages ──────────
        if (isFirstDispatch) {
            activityService.log({
                actor_id: actorId,
                action: 'created',
                entity_type: constant.ENTITY_TYPE.JOB,
                entity_id: updatedJob.id,
                message: `Dispatch Notice created for Job ${updatedJob.job_number}`,
            });
        } else {
            type DispatchFieldKey =
                | 'stagingLocation' | 'loadingTime' | 'trucksLoadingAtOnce'
                | 'njaContactName' | 'njaContactPhone' | 'loadingInstruction'
                | 'additionalInformation' | 'ppeRequirements';

            const DISPATCH_FIELD_MAP: Record<DispatchFieldKey, { label: string; existingKey: keyof typeof existingJob }> = {
                stagingLocation: { label: 'Staging Location', existingKey: 'staging_location' },
                loadingTime: { label: 'Loading Time', existingKey: 'loading_time' },
                trucksLoadingAtOnce: { label: 'Trucks Loading At Once', existingKey: 'trucks_loading_at_once' },
                njaContactName: { label: 'NJA Contact Name', existingKey: 'nja_contact_name' },
                njaContactPhone: { label: 'NJA Contact Phone', existingKey: 'nja_contact_phone' },
                loadingInstruction: { label: 'Loading Instructions', existingKey: 'loading_instruction' },
                additionalInformation: { label: 'Additional Information', existingKey: 'additional_information' },
                ppeRequirements: { label: 'PPE Requirements', existingKey: 'ppe_requirements' },
            };

            const normalize = (v: any): string => {
                if (v === null || v === undefined) return '';
                if (v instanceof Date) return v.toISOString();
                return String(v);
            };

            const changedFields = (Object.keys(DISPATCH_FIELD_MAP) as DispatchFieldKey[])
                .filter(k => {
                    if ((dto as any)[k] === undefined) return false;
                    const incomingVal = k === 'loadingTime'
                        ? (dto.loadingTime ? new Date(dto.loadingTime) : null)
                        : (dto as any)[k];
                    return normalize(incomingVal) !== normalize(existingJob[DISPATCH_FIELD_MAP[k].existingKey]);
                })
                .map(k => {
                    const { label, existingKey } = DISPATCH_FIELD_MAP[k];
                    const oldRaw = existingJob[existingKey];
                    const newRaw = k === 'loadingTime'
                        ? (dto.loadingTime ? new Date(dto.loadingTime) : null)
                        : (dto as any)[k];
                    const oldVal = normalize(oldRaw) || 'N/A';
                    const newVal = normalize(newRaw) || 'N/A';
                    return `${label} updated from ${oldVal} → ${newVal}`;
                });

            for (const message of changedFields) {
                activityService.log({
                    actor_id: actorId,
                    action: 'updated',
                    entity_type: constant.ENTITY_TYPE.JOB,
                    entity_id: updatedJob.id,
                    message,
                });
            }
        }


        return updatedJob;
    }

    public async getJobById(id: number): Promise<any> {
        const job = await prisma.job.findUnique({
            where: { id },
            include: {
                client: {
                    select: { id: true, client_name: true, user: { select: { id: true, name: true, email: true } } }
                },
                documents: true,
                contract: {
                    select: { id: true, contract_number: true, contract_title: true }
                },
                tip: {
                    select: { id: true, contract_number: true, company_name: true }
                },
                creator: {
                    select: { id: true, name: true, email: true }
                },
                material: {
                    select: { id: true, name: true }
                },

                assignments: {
                    include: {
                        vehicle: {
                            select: { id: true, registration_number: true, vehicle_number: true, make: true, model: true, vehicle_category: true }
                        },
                        driver: {
                            select: {
                                id: true, first_name: true, last_name: true, status: true, phone: true, license_class: true, license_expiry: true, license_number: true, driver_type: true,
                                documents: {
                                    where: {
                                        document_type: DriverDocumentType.license,
                                        is_active: true
                                    }
                                },




                            }
                        }
                    }
                }
            }
        });
        if (!job) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));

        let documentsWithUrls = [];
        if (job.documents && job.documents.length > 0) {
            documentsWithUrls = await Promise.all(
                job.documents.map(async (doc: any) => ({
                    ...doc,
                    document_url: await this.imageService.getImageUrl(doc.file_path)
                }))
            );
        }

        return {
            ...job,
            documents: documentsWithUrls
        };
    }


    public async getJobs(query: IGetJobsQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
        totalScheduled: number;
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.JobWhereInput = {};

        if (query.status) where.status = query.status as JobStatus;
        if (query.clientId) where.client_id = query.clientId;
        if (query.priority) where.priority = query.priority as JobPriority;

        if (query.driverId || query.vehicleId) {
            where.assignments = {
                some: {
                    ...(query.driverId ? { driver_id: query.driverId } : {}),
                    ...(query.vehicleId ? { vehicle_id: query.vehicleId } : {}),
                }
            };
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { job_number: { contains: search, mode: 'insensitive' } },
                { pick_up_address: { contains: search, mode: 'insensitive' } },
                { material: { name: { contains: search, mode: 'insensitive' } } },
                { notes: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [data, total, totalScheduled] = await prisma.$transaction([
            prisma.job.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    client: {
                        select: { id: true, client_name: true, user: { select: { id: true, name: true, email: true } } }
                    },
                    contract: {
                        select: { id: true, contract_number: true, contract_title: true }
                    },
                    tip: {
                        select: { id: true, contract_number: true, company_name: true }
                    },
                    creator: {
                        select: { id: true, name: true, email: true }
                    },
                    material: {
                        select: { id: true, name: true }
                    },
                    assignments: {
                        include: {
                            vehicle: {
                                select: { id: true, registration_number: true, vehicle_number: true, make: true, model: true, vehicle_category: true }
                            },
                            driver: {
                                select: { id: true, first_name: true, last_name: true, status: true, phone: true, license_class: true, license_expiry: true, license_number: true, driver_type: true }
                            }
                        }
                    }
                }
            }),
            prisma.job.count({ where }),
            prisma.job.count({ where: { status: JobStatus.scheduled } })
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalScheduled
        };
    }

    public async getJobStats(): Promise<any> {
        const totalJobs = await prisma.job.count();
        const statusCounts = await prisma.job.groupBy({
            by: ['status'],
            _count: {
                status: true
            }
        });

        const statsByStatus = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalJobs,
            statsByStatus
        };
    }



    public async getPreMaterials(): Promise<any[]> {
        return prisma.preMaterial.findMany({
            orderBy: { name: 'asc' }
        });
    }





    public async uploadDispatchDocs(
        jobId: number,
        documentType: JobDocumentType,
        files: Express.Multer.File[],
        documentName?: string,
        actorId?: number | null
    ): Promise<any> {
        const existingJob = await prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true, job_number: true }
        });

        if (!existingJob) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));
        }

        const uploadedDocs = await Promise.all(
            files.map(async (file) => {
                const blobName = constant.MEDIA_PATHS.JOB_MEDIA(
                    existingJob.job_number,
                    documentType,
                    file.filename
                );

                await this.imageService.upload(file.path, blobName);

                const document = await prisma.jobDocument.create({
                    data: {
                        job_id: jobId,
                        document_type: documentType,
                        file_path: blobName,
                        file_name: documentName || file.originalname,
                    }
                });

                return { ...document, document_url: await this.imageService.getImageUrl(blobName) };
            })
        );

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: jobId,
            metadata: {
                message: `Uploaded ${files.length} dispatch document(s)`,
                document_type: documentType
            },
        });

        activityService.log({
            actor_id: actorId ?? null,
            entity_type: constant.ENTITY_TYPE.JOB,
            entity_id: jobId,
            action: "document_uploaded",
            message: `${files.length} document(s) uploaded`,
        });

        return uploadedDocs;
    }

    public async getJobLogs(jobId: number): Promise<any[]> {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true }
        });

        if (!job) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Job'));
        }

        const logs = await prisma.activityLog.findMany({
            where: {
                entity_type: constant.ENTITY_TYPE.JOB,
                entity_id: jobId,
            },
            include: {
                actor: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return logs.map((log) => ({
            label: log.message,
            actor: log.actor?.name || 'System',
            timestamp: log.created_at,
        }));
    }

}
