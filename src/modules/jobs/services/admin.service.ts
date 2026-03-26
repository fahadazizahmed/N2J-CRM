import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ClientStatus, ContractStatus, SequenceEntity, Prisma, ContractType, TollHandling, JobStatus, JobPriority, VehicleStatus, DriverStatus, JobAssignmentStatus, DriverDocumentType } from '../../../../generated/prisma';
import { generateEntityCode } from '../../../helper/helper.method';
import { ICreateJobDTO, IGetJobsQuery, IUpdateJobDTO, IUpdateJobStatusDTO } from '../dto/contract.dto';
import { UnProcessableEntityError } from '../../../errors';




export interface IAdminJobService {
    createJob(dto: ICreateJobDTO, actorId: number | null): Promise<any>;
    updateJob(id: number, dto: IUpdateJobDTO, actorId: number | null): Promise<any>;
    updateJobStatus(id: number, dto: IUpdateJobStatusDTO, actorId: number | null): Promise<any>;
    getJobById(id: number): Promise<any>;
    getJobs(query: IGetJobsQuery): Promise<any>;
    getJobStats(): Promise<any>;
}

export default class AdminJobService implements IAdminJobService {

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
            material,
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
            throw new UnProcessableEntityError(`Vehicle ${overlappingVehicle?.vehicle_number || assignedVehicleId} is already assigned to another job during this time.`);
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

        // 2. No driver can be in a status that prevents them from working
        const unavailableDriver = driversExist.find(d =>
            d.status === DriverStatus.suspended ||
            d.status === DriverStatus.inactive
        );
        if (unavailableDriver) {
            throw new UnProcessableEntityError(
                `Driver ${unavailableDriver.first_name} ${unavailableDriver.last_name} cannot be assigned because their status is '${unavailableDriver.status}'.`
            );
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
                    `Vehicle ${veh?.vehicle_number || vid} is already assigned to another job during this time.`
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

            // 2. Create the Job
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
                    material,
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
        if (dto.material !== undefined) updateData.material = dto.material;
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
                throw new UnProcessableEntityError(`Vehicle ${overlappingVehicle?.vehicle_number || assignedVehicleId} is already assigned to another job during this time.`);
            }

            driversExist = await prisma.driver.findMany({ where: { id: { in: driverIds } } });
            if (driversExist.length !== driverIds.length) {
                const foundIds = driversExist.map(d => d.id);
                const missingId = driverIds.find(id => !foundIds.includes(id));
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND(`Driver ${missingId}`));
            }

            const unavailableDriver = driversExist.find(d =>
                d.status === DriverStatus.suspended ||
                d.status === DriverStatus.inactive
            );
            if (unavailableDriver) {
                throw new UnProcessableEntityError(
                    `Driver ${unavailableDriver.first_name} ${unavailableDriver.last_name} cannot be assigned because their status is '${unavailableDriver.status}'.`
                );
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
                        `Vehicle ${veh?.vehicle_number || vid} is already assigned to another job during this time.`
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

        return updatedJob;
    }

    public async getJobById(id: number): Promise<any> {
        const job = await prisma.job.findUnique({
            where: { id },
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


                assignments: {
                    include: {
                        vehicle: {
                            select: { id: true, registration_number: true, vehicle_number: true, make: true, model: true, vehicle_category: true }
                        },
                        driver: {
                            select: {
                                id: true, first_name: true, last_name: true, status: true, phone: true, license_class: true, license_expiry: true, license_number: true,
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
        return job;
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
                { material: { contains: search, mode: 'insensitive' } },
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
                    assignments: {
                        include: {
                            vehicle: {
                                select: { id: true, registration_number: true, vehicle_number: true, make: true, model: true, vehicle_category: true }
                            },
                            driver: {
                                select: { id: true, first_name: true, last_name: true, status: true, phone: true, license_class: true, license_expiry: true, license_number: true }
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

    //     id: number,
    //     dto: IUpdateContractDTO,
    //     actorId: number | null
    // ): Promise<ClientContract> {
    //     // 1. Validate contract exists
    //     const existingContract = await prisma.clientContract.findUnique({
    //         where: { id },
    //     });

    //     if (!existingContract) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
    //     }

    //     // // 2. Guard: draft-only fields cannot be edited once the contract is no longer in draft status
    //     const draftOnlyFieldsProvided =
    //         dto.startDate !== undefined ||
    //         dto.endDate !== undefined ||
    //         // dto.creditTermsOverride !== undefined ||
    //         dto.specialTerms !== undefined;

    //     if (draftOnlyFieldsProvided && existingContract.status !== ContractStatus.draft) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT.DRAFT_ONLY_FIELDS);
    //     }
    //     // 4. Update the Contract and Audit Log in a Transaction
    //     const updatedContract = await prisma.$transaction(async (tx) => {
    //         const updateData: any = {};
    //         if (dto.address !== undefined) updateData.address = dto.address;
    //         if (dto.phone !== undefined) updateData.phone = dto.phone;
    //         if (dto.countryCode !== undefined) updateData.country_code = dto.countryCode;
    //         if (dto.abn !== undefined) updateData.abn = dto.abn;
    //         if (dto.companyName !== undefined) updateData.company_name = dto.companyName;
    //         if (dto.email !== undefined) updateData.email = dto.email;
    //         if (dto.contractTitle !== undefined) updateData.contract_title = dto.contractTitle;
    //         if (dto.startDate !== undefined) updateData.start_date = new Date(dto.startDate);
    //         if (dto.endDate !== undefined) updateData.end_date = new Date(dto.endDate);
    //         if (dto.specialTerms !== undefined) updateData.special_terms = dto.specialTerms;
    //         if (dto.contractType !== undefined) updateData.contract_type = dto.contractType;
    //         if (dto.contractContactName !== undefined) updateData.contract_contact_name = dto.contractContactName;
    //         if (dto.contractContactEmail !== undefined) updateData.contract_contact_email = dto.contractContactEmail;
    //         if (dto.contractContactPhone !== undefined) updateData.contract_contact_phone = dto.contractContactPhone;
    //         if (dto.status !== undefined) updateData.status = dto.status;

    //         return tx.clientContract.update({
    //             where: { id },
    //             data: updateData,
    //         });
    //     }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_MAX_WAIT });

    //     // Fire-and-forget audit log
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.UPDATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRACT,
    //         entity_id: updatedContract.id,
    //         metadata: {
    //             client_id: updatedContract.client_id,
    //             contract_number: updatedContract.contract_number,
    //             contractManagerId: updatedContract.contract_manager_id,
    //             action: InfoMessages.LOGGER_MESSAGE.CONTRACT_GENERATE_INFOT_UPDATED_SUCCESSFULLY || "Contract updated successfully",
    //             changes: dto
    //         },
    //     });

    //     return updatedContract;
    // }

    // // ─── Update Contract Status ──────────────────────────────────────────
    // public async updateContractStatus(
    //     id: number,
    //     dto: IUpdateContractStatusDTO,
    //     actorId: number | null
    // ): Promise<ClientContract> {
    //     // 1. Validate contract exists (fetch with client for eligibility checks)
    //     const existing = await prisma.clientContract.findUnique({
    //         where: { id },
    //         select: {
    //             id: true,
    //             status: true,
    //             contract_number: true,
    //             client_id: true,
    //             start_date: true,
    //             end_date: true,
    //             client: {
    //                 select: {
    //                     id: true,
    //                     status: true,
    //                     gst_status: true,
    //                     credit_score: true,

    //                 },
    //             },
    //         },
    //     });

    //     if (!existing) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
    //     }

    //     // 2. Run eligibility checks ONLY when activating the contract
    //     if (dto.status === ContractStatus.active) {
    //         if (!existing.start_date) {
    //             throw new BadRequestError(ErrorMessages.CONTRACT_RATE.START_DATE_MUST_GIVEN);
    //         }

    //         // Contract end date must be in the future — no point activating an already-expired contract
    //         if (existing.end_date) {
    //             const today = new Date();
    //             today.setUTCHours(0, 0, 0, 0);
    //             const endDate = new Date(existing.end_date);
    //             endDate.setUTCHours(0, 0, 0, 0);
    //             if (endDate < today) {
    //                 throw new BadRequestError(
    //                     'Contract cannot be activated because its end date is in the past. Please update the end date to a future date.'
    //                 );
    //             }
    //         }

    //         // Contract must have at least one rate before activation
    //         const rateCount = await prisma.clientContractRate.count({
    //             where: { contract_id: id },
    //         });

    //         if (rateCount === 0) {
    //             throw new BadRequestError(ErrorMessages.CONTRACT_RATE.NO_RATES);
    //         }

    //     }
    //     //  5. Update status only
    //     const updated = await prisma.clientContract.update({
    //         where: { id },
    //         data: { status: dto.status },
    //     });

    //     // 6. Fire-and-forget audit log
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.UPDATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRACT,
    //         entity_id: id,
    //         metadata: {
    //             contract_number: existing.contract_number,
    //             previous_status: existing.status,
    //             new_status: dto.status,
    //         },
    //     });

    //     return updated;
    // }


    // // ─── Update Contract Approval Status ────────────────────────────────
    // public async updateContractApprovalStatus(
    //     id: number,
    //     dto: IUpdateContractApprovalStatusDTO,
    //     actorId: number | null
    // ): Promise<ClientContract> {
    //     // 1. Validate contract exists
    //     const existing = await prisma.clientContract.findUnique({
    //         where: { id },
    //         select: {
    //             id: true,
    //             status: true,
    //             approval_status: true,
    //             contract_number: true,
    //             client_id: true,
    //             start_date: true,
    //             end_date: true,
    //             client: {
    //                 select: {
    //                     id: true,
    //                     status: true,
    //                     gst_status: true,
    //                     credit_score: true,
    //                 },
    //             },
    //         },
    //     });

    //     if (!existing) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
    //     }

    //     // 2. Build update payload — include reason only when provided
    //     const updateData: { approval_status: typeof dto.status; approval_reason?: string | null } = {
    //         approval_status: dto.status,
    //     };

    //     if (dto.reason !== undefined) {
    //         updateData.approval_reason = dto.reason ?? null;
    //     }

    //     // 3. Persist the changes
    //     const updated = await prisma.clientContract.update({
    //         where: { id },
    //         data: updateData,
    //     });

    //     // 4. Fire-and-forget audit log
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.UPDATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRACT,
    //         entity_id: id,
    //         metadata: {
    //             contract_number: existing.contract_number,
    //             previous_approval_status: existing.approval_status,
    //             new_approval_status: dto.status,
    //             ...(dto.reason ? { reason: dto.reason } : {}),
    //         },
    //     });

    //     return updated;
    // }



    // public async uploadContractDocs(contractId: number, clientId: number, file: any, documentName: string): Promise<any> {
    //     // Validate contract exists
    //     const existingContract = await prisma.clientContract.findUnique({
    //         where: { id: contractId },
    //         select: { id: true, contract_number: true, client_id: true }
    //     });

    //     if (!existingContract) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
    //     }

    //     const customBlobName = constant.MEDIA_PATHS.CONTRACT_MEDIA(existingContract.contract_number, file.filename);

    //     // File url to return
    //     this.imageService.upload(file.path, customBlobName);


    //     // Store the document path in the new ClientContractDocument table
    //     const document = await prisma.clientContractDocument.create({
    //         data: {
    //             contract_id: contractId,
    //             document_path: customBlobName,
    //             file_name: documentName,


    //         },
    //     });
    //     let doc = { ...document, document_url: await this.imageService.getImageUrl(customBlobName), }

    //     return { doc };
    // }

    // // ─── Get Contract By ID ───────────────────────────────────────────────
    // public async getContractById(id: number): Promise<any> {
    //     const contract = await prisma.clientContract.findUnique({
    //         where: { id },
    //         include: contractFullInclude,
    //     });
    //     if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

    //     // Resolve signed URLs for each document (parallel)
    //     const documentsWithUrls = await Promise.all(
    //         contract.documents.map(async (doc) => ({
    //             ...doc,
    //             document_url: await this.imageService.getImageUrl(doc.document_path),
    //         }))
    //     );

    //     return { ...contract, documents: documentsWithUrls };
    // }

    // // ─── Get Contracts with Pagination, Filter & Search ────────────────────
    // public async getContracts(query: IGetContractsQuery): Promise<{
    //     data: any[];
    //     pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    //     totalDraft: number;
    // }> {
    //     const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
    //     const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
    //     const skip = (page - 1) * limit;

    //     const where: Prisma.ClientContractWhereInput = {};

    //     // ─ Filter by status ────────────────────────────────────────────
    //     if (query.status) {
    //         where.status = query.status as ContractStatus;
    //     }
    //     if (query.approval) {
    //         where.approval_status = query.approval as ApprovalStatus;
    //     }

    //     // ─ Filter by contract type ─────────────────────────────────────
    //     // If a specific type is passed (e.g. 'supplier' or 'client'), filter by it.
    //     // If nothing is passed, return all contracts (both supplier and client).
    //     if (query.contractType) {
    //         where.contract_type = query.contractType as ContractType;
    //     }

    //     // ─ Search: contract number, title, contact name, email, client name ─
    //     if (query.search) {
    //         const search = query.search.trim();
    //         where.OR = [
    //             { contract_number: { contains: search, mode: 'insensitive' } },
    //             { contract_title: { contains: search, mode: 'insensitive' } },
    //             { contract_contact_name: { contains: search, mode: 'insensitive' } },
    //             { contract_contact_email: { contains: search, mode: 'insensitive' } },
    //             { address: { contains: search, mode: 'insensitive' } },
    //             { company_name: { contains: search, mode: 'insensitive' } },
    //             { abn: { contains: search, mode: 'insensitive' } },
    //             { email: { contains: search, mode: 'insensitive' } },
    //             { phone: { contains: search, mode: 'insensitive' } },
    //         ];
    //     }

    //     const [data, total, totalDraft] = await prisma.$transaction([
    //         prisma.clientContract.findMany({
    //             where,
    //             skip,
    //             take: limit,
    //             orderBy: { created_at: 'desc' },
    //             include: contractFullInclude,
    //         }),
    //         prisma.clientContract.count({ where }),
    //         prisma.clientContract.count({ where: { status: ContractStatus.draft,contract_type:query.contractType } }),
    //     ]);

    //     const hasNext = (skip + data.length) < total;
    //     const hasPrevious = page > 1;

    //     return {
    //         data,
    //         pagination: { total, page, limit, hasNext, hasPrevious },
    //         totalDraft,
    //     };
    // }



    // private toDateOnly(date: Date): Date {
    //     return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // }

    // // ─── Helper: subOneDayUTC ───────────────────────────────────────────────────
    // private subOneDay(date: Date): Date {
    //     const d = new Date(date);
    //     d.setUTCDate(d.getUTCDate() - 1);
    //     return d;
    // } private async assertNoOverlap(
    //     contractId: number,
    //     effectiveFrom: Date,
    //     effectiveTo: Date | null,
    //     excludeRateId: number | null
    // ): Promise<void> {


    //     // Condition: existing rate overlaps the new rate's period
    //     const overlapCondition: any = {
    //         contract_id: contractId,
    //         // The existing rate starts before or on the new rate's end (or new rate has no end → always)
    //         effective_from: effectiveTo ? { lte: effectiveTo } : undefined,
    //         OR: [
    //             // The existing rate has no end → extends to +infinity, so always overlaps
    //             { effective_to: null },
    //             // The existing rate ends on or after the new rate's start
    //             { effective_to: { gte: effectiveFrom } },
    //         ],
    //     };


    //     if (excludeRateId) {
    //         overlapCondition.id = { not: excludeRateId };
    //     }

    //     // Remove undefined keys (Prisma doesn't like them)
    //     if (!effectiveTo) {
    //         delete overlapCondition.effective_from;
    //     }

    //     const conflicting = await prisma.clientContractRate.findFirst({
    //         where: overlapCondition,
    //     });

    //     if (conflicting) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT_RATE.OVERLAP);
    //     }
    // }

    // public async addRate(
    //     contractId: number,
    //     dto: IAddContractRateDTO,
    //     actorId: number | null
    // ): Promise<ClientContractRate> {
    //     // 1. Fetch contract
    //     const contract = await prisma.clientContract.findUnique({
    //         where: { id: contractId },
    //         select: { id: true, status: true, start_date: true, end_date: true },
    //     });

    //     if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

    //     // 2. Only draft contracts can use this endpoint
    //     if (contract.status !== ContractStatus.draft) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DRAFT_NOT_EDITABLE_AFTER_ACTIVATE);
    //     }
    //     if (!contract.start_date || !contract.end_date) throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DATE_MUST_GIVEN);

    //     const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
    //     const contractStart = this.toDateOnly(contract.start_date);
    //     const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

    //     // 3. effectiveFrom must not be before contract start_date
    //     if (effectiveFrom < contractStart) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START);
    //     }
    //     if (contractEnd && effectiveFrom > contractEnd) {
    //         throw new BadRequestError(
    //             ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
    //         );
    //     }
    //     // 4. Overlap check — no other rate on this contract can cover effectiveFrom
    //     await this.assertNoOverlap(contractId, effectiveFrom, null, null);

    //     // 5. Insert the rate
    //     const rate = await prisma.clientContractRate.create({
    //         data: {
    //             contract_id: contractId,
    //             billing_type: dto.billingType,
    //             rate: dto.rate,
    //             material_type: dto.materialType ?? null,
    //             minimum_charge: dto.minimumCharge ?? null,
    //             toll_handling: dto.tollHandling ?? TollHandling.included,
    //             effective_from: effectiveFrom,
    //             effective_to: null, // open-ended — this is the latest rate
    //         },
    //     });

    //     // 6. Audit log (fire-and-forget)
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.CREATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
    //         entity_id: rate.id,
    //         metadata: { contract_id: contractId, billing_type: dto.billingType, rate: dto.rate, effective_from: effectiveFrom },
    //     });

    //     return rate;
    // }


    // public async updateDraftContract(
    //     contractId: number,
    //     rateId: number,
    //     dto: IUpdateContractRateDTO,
    //     actorId: number | null
    // ): Promise<ClientContractRate> {

    //     // 1. Fetch contract
    //     const contract = await prisma.clientContract.findUnique({
    //         where: { id: contractId },
    //         select: { id: true, status: true, start_date: true, end_date: true },
    //     });

    //     if (!contract) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
    //     }

    //     // 2. Only draft contracts can update rates
    //     if (contract.status !== ContractStatus.draft) {
    //         throw new BadRequestError('Rates can only be edited when contract is in draft state.');
    //     }

    //     // 3. Fetch the rate
    //     const rate = await prisma.clientContractRate.findFirst({
    //         where: {
    //             id: rateId,
    //             contract_id: contractId,
    //         },
    //     });

    //     if (!rate) {
    //         throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract Rate'));
    //     }
    //     if (!contract.start_date || !contract.end_date) throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DATE_MUST_GIVEN);

    //     const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
    //     const contractStart = this.toDateOnly(contract.start_date);
    //     const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

    //     // 4. Validate effective_from
    //     if (effectiveFrom < contractStart) {
    //         throw new BadRequestError(
    //             ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START
    //         );
    //     }
    //     if (contractEnd && effectiveFrom > contractEnd) {
    //         throw new BadRequestError(
    //             ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
    //         );
    //     }


    //     // normalize effectiveTo
    //     const effectiveTo = dto.effectiveTo
    //         ? this.toDateOnly(new Date(dto.effectiveTo))
    //         : null;

    //     // NEW VALIDATION
    //     if (effectiveTo && effectiveTo < effectiveFrom) {
    //         throw new BadRequestError(
    //             "effectiveTo must be greater than or equal to effectiveFrom"
    //         );
    //     }

    //     // 5. Prevent overlap with other rates
    //     await this.assertNoOverlap(
    //         contractId,
    //         effectiveFrom,
    //         dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    //         rateId
    //     );

    //     // 6. Update rate
    //     const updatedRate = await prisma.clientContractRate.update({
    //         where: { id: rateId },
    //         data: {
    //             billing_type: dto.billingType,
    //             rate: dto.rate,
    //             material_type: dto.materialType ?? null,
    //             minimum_charge: dto.minimumCharge ?? null,
    //             toll_handling: dto.tollHandling ?? 'included',
    //             effective_from: effectiveFrom,
    //             effective_to: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    //         },
    //     });

    //     // 7. Audit log
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.UPDATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
    //         entity_id: updatedRate.id,
    //         metadata: {
    //             contract_id: contractId,
    //             billing_type: dto.billingType,
    //             rate: dto.rate,
    //             effective_from: effectiveFrom,
    //         },
    //     });

    //     return updatedRate;
    // }

    // public async changeRate(
    //     contractId: number,
    //     dto: IChangeContractRateDTO,
    //     actorId: number | null
    // ): Promise<ClientContractRate> {
    //     // 1. Fetch contract
    //     const contract = await prisma.clientContract.findUnique({
    //         where: { id: contractId },
    //         select: { id: true, status: true, start_date: true, end_date: true },
    //     });

    //     if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

    //     // 2. Draft contracts cannot use the rate-change endpoint
    //     if (contract.status === ContractStatus.draft) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT_RATE.RATE_CHANGE_NOT_ALLOWED_ON_DRAFT);
    //     }

    //     const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
    //     const contractStart = this.toDateOnly(contract.start_date);
    //     const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

    //     // 3. effectiveFrom must not be before contract start_date
    //     if (effectiveFrom < contractStart) {
    //         throw new BadRequestError(ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START);
    //     }
    //     if (contractEnd && effectiveFrom > contractEnd) {
    //         throw new BadRequestError(
    //             ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
    //         );
    //     }


    //     // 4. Find the current active rate covering effectiveFrom
    //     //    (effective_from <= effectiveFrom AND (effective_to IS NULL OR effective_to >= effectiveFrom))
    //     const currentActiveRate = await prisma.clientContractRate.findFirst({
    //         where: {
    //             contract_id: contractId,
    //             effective_from: { lte: effectiveFrom },
    //             OR: [
    //                 { effective_to: null },
    //                 { effective_to: { gte: effectiveFrom } },
    //             ],
    //         },
    //         orderBy: { effective_from: 'desc' }, // latest first in case of multiple matches
    //     });

    //     if (!currentActiveRate) {
    //         throw new BadRequestError(
    //             ErrorMessages.CONTRACT_RATE.NO_ACTIVE_RATE_ON_DATE(effectiveFrom.toISOString().split('T')[0])
    //         );
    //     }

    //     // 5. If effectiveFrom == currentActiveRate.effective_from they would collide (zero-duration old rate).
    //     //    In that case we simply replace the existing rate's values in-place ONLY if this is the open-ended
    //     //    (effective_to = null) rate AND no jobs have billed against it yet.
    //     //    For now we reject this edge case with a clear message — keep the append-only rule strict.
    //     if (effectiveFrom.getTime() === this.toDateOnly(currentActiveRate.effective_from).getTime()) {
    //         throw new BadRequestError(
    //             'effectiveFrom cannot be the same as the current rate\'s effective_from. The new rate must start at least 1 day after the current one.'
    //         );
    //     }

    //     // 6. Overlap check against any CLOSED rate whose period would conflict
    //     //    (excluding the current open-ended rate we are about to close)
    //     await this.assertNoOverlap(contractId, effectiveFrom, null, currentActiveRate.id);

    //     // 7. Execute in a transaction: close old rate + insert new rate
    //     const newRate = await prisma.$transaction(async (tx) => {
    //         // Close old rate: effective_to = effectiveFrom - 1 day
    //         const closeDate = this.subOneDay(effectiveFrom);
    //         await tx.clientContractRate.update({
    //             where: { id: currentActiveRate.id },
    //             data: { effective_to: closeDate },
    //         });

    //         // Insert new rate
    //         return tx.clientContractRate.create({
    //             data: {
    //                 contract_id: contractId,
    //                 billing_type: dto.billingType,
    //                 rate: dto.rate,
    //                 material_type: dto.materialType ?? null,
    //                 minimum_charge: dto.minimumCharge ?? null,
    //                 toll_handling: dto.tollHandling ?? 'included',
    //                 effective_from: effectiveFrom,
    //                 effective_to: null, // open-ended
    //             },
    //         });
    //     }, { maxWait: 10000, timeout: 20000 });

    //     // 8. Audit log (fire-and-forget)
    //     auditService.logWithRetry({
    //         actor_id: actorId,
    //         action: constant.AUDIT_LOG_ACTION.UPDATE,
    //         entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
    //         entity_id: newRate.id,
    //         metadata: {
    //             contract_id: contractId,
    //             closed_rate_id: currentActiveRate.id,
    //             closed_rate_to: this.subOneDay(effectiveFrom).toISOString().split('T')[0],
    //             new_billing_type: dto.billingType,
    //             new_rate: dto.rate,
    //             new_effective_from: effectiveFrom.toISOString().split('T')[0],
    //         },
    //     });

    //     return newRate;
    // }




    // public async getRates(contractId: number): Promise<ClientContractRate[]> {
    //     const contract = await prisma.clientContract.findUnique({
    //         where: { id: contractId },
    //         select: { id: true },
    //     });
    //     if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

    //     return prisma.clientContractRate.findMany({
    //         where: { contract_id: contractId },
    //         orderBy: { effective_from: 'asc' },
    //     });
    // }




}
