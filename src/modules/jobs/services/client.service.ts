 import { prisma } from '../../../connection/db';
import { NotFoundError } from '../../../errors/not-found-error';
import ErrorMessages from '../../../common/constant/errors';

export default class ClientJobService {

    /**
     * Fetches all jobs belonging to the given clientId.
     * Enriches each job with contract info, material type, and
     * job assignments (including driver and vehicle details).
     */
    public async getClientJobs(clientId: number): Promise<any[]> {

        const client = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Client'));
        }

        const jobs = await prisma.job.findMany({
            where: { client_id: clientId },
            orderBy: { created_at: 'desc' },
            include: {
                contract: {
                    select: {
                        id: true,
                        contract_number: true,
                        contract_title: true,
                        status: true,
                    },
                },
                material: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignments: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                driver_number: true,
                                first_name: true,
                                last_name: true,
                                phone: true,
                                status: true,
                            },
                        },
                        vehicle: {
                            select: {
                                id: true,
                                vehicle_number: true,
                                registration_number: true,
                                make: true,
                                model: true,
                                status: true,
                            },
                        },
                    },
                },
                documents: {
                    select: {
                        id: true,
                        document_type: true,
                        file_name: true,
                        file_path: true,
                        created_at: true,
                    },
                },
            },
        });

        // ── Transform / enrich before returning ─────────────────────────────
        return jobs.map((job) => ({
            id: job.id,
            jobNumber: job.job_number,
            status: job.status,
            priority: job.priority,
            pickUpAddress: job.pick_up_address,
            entryDate: job.entry_date,
            deliveryDate: job.delivery_date,
            quantity: job.quantity,
            quantityUnit: job.quantity_unit,
            rate: job.rate,
            billingType: job.billing_type,
            notes: job.notes ?? null,
            contract: job.contract ?? null,
            material: job.material ?? null,
            assignments: job.assignments.map((a) => ({
                id: a.id,
                status: a.status,
                driver: a.driver
                    ? {
                          id: a.driver.id,
                          driverNumber: a.driver.driver_number,
                          fullName: `${a.driver.first_name} ${a.driver.last_name}`,
                          phone: a.driver.phone,
                          status: a.driver.status,
                      }
                    : null,
                vehicle: a.vehicle
                    ? {
                          id: a.vehicle.id,
                          vehicleNumber: a.vehicle.vehicle_number,
                          registrationNumber: a.vehicle.registration_number,
                          make: a.vehicle.make,
                          model: a.vehicle.model,
                          status: a.vehicle.status,
                      }
                    : null,
            })),
            documents: job.documents,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
        }));
    }
}
