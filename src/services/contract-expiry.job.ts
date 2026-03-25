import cron from 'node-cron';
import { prisma } from '../connection/db';
import { ContractStatus } from '../../generated/prisma';

/**
 * Runs once every day at midnight (00:00) server time.
 * Finds all contracts that are still "active" but whose end_date
 * has already passed, and bulk-transitions them to "expired".
 */
export function scheduleContractExpiryJob(): void {
    cron.schedule('0 0 * * *', async () => {
        try {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            const result = await prisma.clientContract.updateMany({
                where: {
                    status: ContractStatus.active,
                    end_date: { lt: today },
                },
                data: { status: ContractStatus.expired },
            });

            if (result.count > 0) {
                console.info(
                    `[ContractExpiryJob] ${result.count} contract(s) marked as expired.`
                );
            }
        } catch (error) {
            console.error('[ContractExpiryJob] Failed to expire contracts:', error);
        }
    });

    console.info('[ContractExpiryJob] Scheduled — runs daily at midnight.');
}
