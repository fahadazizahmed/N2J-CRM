import { prisma } from '../connection/db';
import { failedOperationService } from './failed-operation.service';
import { OperationType } from '../common/types/failed-operation.types';

interface ICreateAuditLog {
    actor_id?: number | null;
    action: string;
    entity_type: string;
    entity_id: number;
    metadata?: any;
}

class AuditService {
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 500; // Fixed 500ms delay for DB operations

    /**
     * Utility function to delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logs an action to the database with retry logic
     * @param logDetails Details about the action performed
     * @returns {success: boolean, error?: any}
     */
    public async logWithRetry(logDetails: ICreateAuditLog): Promise<{ success: boolean; error?: any }> {
        let lastError: any;

        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {

                await prisma.auditLog.create({
                    data: {
                        actor_id: logDetails.actor_id,
                        action: logDetails.action,
                        entity_type: logDetails.entity_type,
                        entity_id: logDetails.entity_id,
                        metadata: logDetails.metadata || {},
                    },
                });
                return { success: true };

            } catch (error: any) {
                lastError = error;
                const isLastAttempt = attempt === this.MAX_RETRIES - 1;
                // Don't delay after the last attempt
                if (!isLastAttempt) {
                    await this.delay(this.RETRY_DELAY);
                }
            }
        }

        // Store failed audit log in database for later retry
        await failedOperationService.logFailure({
            operation_type: OperationType.AUDIT_LOG,
            entity_type: logDetails.entity_type,
            entity_id: logDetails.entity_id,
            payload: {
                actor_id: logDetails.actor_id,
                action: logDetails.action,
                entity_type: logDetails.entity_type,
                entity_id: logDetails.entity_id,
                metadata: logDetails.metadata
            },
            error_message: lastError?.message || String(lastError)
        });

        return { success: false, error: lastError };
    }

    /**
     * Original log method (kept for backward compatibility)
     * @deprecated Use logWithRetry for better reliability
     */
    public async log(logDetails: ICreateAuditLog): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    actor_id: logDetails.actor_id,
                    action: logDetails.action,
                    entity_type: logDetails.entity_type,
                    entity_id: logDetails.entity_id,
                    metadata: logDetails.metadata || {},
                },
            });

        } catch (error) {
            console.error('Failed to create audit log:', error);
            // We generally don't want audit logging failure to crash the main request flow
        }
    }
}

export const auditService = new AuditService();
