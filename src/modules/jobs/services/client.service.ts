
import { prisma } from '../../../connection/db';
import { NotFoundError } from '../../../errors/not-found-error';

export default class ClientJobService {
    public async getClientJobs(userId: number) {
        // Find the client record tied to the user
        const client = await prisma.client.findUnique({
            where: { user_id: userId },
            select: { id: true, client_name: true }
        });

        if (!client) {
            throw new NotFoundError("Client profile not found. Contact support.");
        }

        // Fetch jobs for this client
        const jobs = await prisma.job.findMany({
            where: { client_id: client.id },
            include: {
                client: { select: { client_name: true } },
                material: { select: { name: true } },
                tip: { select: { company_name: true, contract_number: true, address: true } },
                assignments: {
                    include: {
                        vehicle: true,
                        driver: true
                    }
                },
                documents: true,
                creator: { select: { name: true, email: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        return jobs;
    }
}

