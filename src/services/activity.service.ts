import { prisma } from '../connection/db';
class ActivityService {
    public async log({
        actor_id,
        action,
        entity_type,
        entity_id,
        message,
        metadata,
    }: {
        actor_id?: number | null;
        action: string;
        entity_type: string;
        entity_id: number;
        message: string;
        metadata?: any;
    }) {
        try {
            await prisma.activityLog.create({
                data: {
                    actor_id,
                    action,
                    entity_type,
                    entity_id,
                    message,
                    metadata: metadata ?? {},
                },
            });
        } catch (error) {
            console.error("Activity log failed:", error);

        }
    }
}

export const activityService = new ActivityService();