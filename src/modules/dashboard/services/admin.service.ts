import { prisma } from '../../../connection/db';
import constant from '../../../common/constant/constant';

import { ClientStatus, JobStatus, VehicleStatus, DriverStatus, VehicleCategory, SubcontractorStatus } from '../../../../generated/prisma';
// Only surface meaningful, user-facing actions — skip noisy field-level diffs
const IMPORTANT_ACTIONS = ['created', 'status_changed', 'invited'];

export interface IGetActivityLogsQuery {
    page?: number;
    limit?: number;
    entityType?: string;   // optional: 'Job', 'Driver', etc.
    entityId?: number;     // optional: filter by a specific entity
}

export default class DashboardAdminService {

    public async getActivityLogs(query: IGetActivityLogsQuery): Promise<{
        data: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            hasNext: boolean;
            hasPrevious: boolean;
        };
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: any = {
            action: { in: IMPORTANT_ACTIONS },
        };

        if (query.entityType) {
            where.entity_type = query.entityType;
        }

        if (query.entityId) {
            where.entity_id = query.entityId;
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    actor: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            prisma.activityLog.count({ where }),
        ]);

        const data = logs.map((log) => ({
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            message: log.message,
            actor: log.actor ? { id: log.actor.id, name: log.actor.name, email: log.actor.email } : null,
            timestamp: log.created_at,
        }));

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
        };
    }

    /**
     * Lightweight feed for the dashboard home widget.
     * Returns the 20 most recent important actions — no pagination overhead.
     */
    public async getRecentActivity(): Promise<any[]> {
        const logs = await prisma.activityLog.findMany({
            where: {
                action: { in: IMPORTANT_ACTIONS },
            },
            include: {
                actor: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { created_at: 'desc' },
            take: 20,
        });

        return logs.map((log) => ({
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            label: log.message,
            actor: log.actor?.name ?? 'System',
            timestamp: log.created_at,
        }));
    }

    public async getDashboardStats(): Promise<any> {
        const [
            totalClients, activeClients,
            totalJobs, activeJobs,
            totalDrivers, activeDrivers,
            totalVehicles, activeVehicles,
            fleetVehicles, activeFleetVehicles,
            totalSubcontractors, activeSubcontractors
        ] = await Promise.all([
            prisma.client.count(),
            prisma.client.count({ where: { status: ClientStatus.active } }),

            prisma.job.count(),
            prisma.job.count({ where: { status: { in: [JobStatus.scheduled, JobStatus.inProgress, JobStatus.dispatched] } } }),

            prisma.driver.count(),
            prisma.driver.count({ where: { status: DriverStatus.active } }),

            prisma.vehicle.count(),
            prisma.vehicle.count({ where: { status: VehicleStatus.active } }),

            prisma.vehicle.count({ where: { vehicle_category: { in: [VehicleCategory.inHouse, VehicleCategory.casual] } } }),
            prisma.vehicle.count({ where: { vehicle_category: { in: [VehicleCategory.inHouse, VehicleCategory.casual] }, status: VehicleStatus.active } }),

            prisma.subcontractor.count(),
            prisma.subcontractor.count({ where: { status: SubcontractorStatus.active } })
        ]);

        return {
            clients: { total: totalClients, active: activeClients },
            jobs: { total: totalJobs, active: activeJobs },
            drivers: { total: totalDrivers, active: activeDrivers },
            vehicles: {
                total: totalVehicles,
                active: activeVehicles,
                fleetTotal: fleetVehicles,
                fleetActive: activeFleetVehicles
            },
            subcontractors: { total: totalSubcontractors, active: activeSubcontractors }
        };
    }
}
