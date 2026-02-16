import { prisma } from '../connection/db';
import { OperationStatus, ICreateFailedOperation } from '../common/types/failed-operation.types';

class FailedOperationService {
    /**
     * Log a failed operation to the database
     */
    public async logFailure(details: ICreateFailedOperation): Promise<void> {
        try {
            await prisma.failedOperation.create({
                data: {
                    operation_type: details.operation_type,
                    entity_type: details.entity_type,
                    entity_id: details.entity_id,
                    payload: details.payload,
                    error_message: details.error_message,
                    status: OperationStatus.PENDING,
                    retry_count: 0
                }
            });

        } catch (error) {
            // Last resort: if we can't even log the failure, log to console
        }
    }

    /**
     * Get all pending failed operations
     */
    public async getPendingOperations(limit: number = 100) {
        return await prisma.failedOperation.findMany({
            where: {
                status: OperationStatus.PENDING
            },
            orderBy: {
                created_at: 'asc'
            },
            take: limit
        });
    }

    /**
     * Mark operation as retried
     */
    public async markAsRetried(id: number): Promise<void> {
        await prisma.failedOperation.update({
            where: { id },
            data: {
                status: OperationStatus.RETRIED,
                retry_count: { increment: 1 },
                last_retry_at: new Date()
            }
        });
    }

    /**
     * Mark operation as resolved
     */
    public async markAsResolved(id: number): Promise<void> {
        await prisma.failedOperation.update({
            where: { id },
            data: {
                status: OperationStatus.RESOLVED,
                resolved_at: new Date()
            }
        });
    }

    /**
     * Mark operation as abandoned (after too many retries)
     */
    public async markAsAbandoned(id: number): Promise<void> {
        await prisma.failedOperation.update({
            where: { id },
            data: {
                status: OperationStatus.ABANDONED
            }
        });
    }
}

export const failedOperationService = new FailedOperationService();
