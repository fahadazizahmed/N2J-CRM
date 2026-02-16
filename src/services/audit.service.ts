import { prisma } from '../connection/db';

interface ICreateAuditLog {
    actor_id?: number | null;
    action: string;
    entity_type: string;
    entity_id: number;
    metadata?: any;
}

class AuditService {
    /**
     * Logs an action to the database.
     * @param logDetails Details about the action performed
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
            console.log(`Audit Log Created: ${logDetails.action} on ${logDetails.entity_type}:${logDetails.entity_id}`);
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // We generally don't want audit logging failure to crash the main request flow, 
            // but in strict compliance systems, you might want to throw here.
        }
    }
}

export const auditService = new AuditService();
