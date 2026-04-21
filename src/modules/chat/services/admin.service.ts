import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import ErrorMessages from '../../../common/constant/errors';
import { JobStatus } from '../../../../generated/prisma';

export interface SendMessageDto {
    jobId: number;
    message: string;
    recipientType: 'all' | 'single';
    driverId?: number;
}

export interface IAdminMessageService {
    sendMessage(dto: SendMessageDto, actorId: number | null): Promise<any>;
    getMessages(jobId: number): Promise<any>;
}

export default class AdminMessageService implements IAdminMessageService {
    public async sendMessage(
        dto: SendMessageDto,
        actorId: number | null
    ): Promise<any> {
        if (!actorId) {
            throw new BadRequestError('Actor ID is missing');
        }

        const job = await prisma.job.findUnique({
            where: { id: dto.jobId },
            include: {
                assignments: {
                    select: { driver_id: true }
                }
            }
        });

        if (!job) {
            throw new NotFoundError(ErrorMessages.JOB.NOT_FOUND);
        }


        if (job.status === JobStatus.completed || job.status === JobStatus.cancelled) {
            throw new BadRequestError(`Cannot send messages for a job that is ${job.status}`);
        }

        let targetDriverIds: number[] = [];

        if (dto.recipientType === 'all') {
            targetDriverIds = job.assignments.map((a: any) => a.driver_id);
            if (targetDriverIds.length === 0) {
                throw new BadRequestError('No drivers assigned to this job');
            }
        } else if (dto.recipientType === 'single') {
            if (!dto.driverId) {
                throw new BadRequestError('driverId is required when recipientType is "single"');
            }
            const isAssigned = job.assignments.some((a: any) => a.driver_id === dto.driverId);
            if (!isAssigned) {
                throw new BadRequestError('The specified driver is not assigned to this job');
            }
            targetDriverIds = [dto.driverId];
        }

        const message = await prisma.jobMessage.create({
            data: {
                job_id: dto.jobId,
                sender_type: 'ADMIN',
                sender_id: actorId,
                message: dto.message,
                recipients: {
                    create: targetDriverIds.map(driverId => ({
                        driver_id: driverId
                    }))
                }
            },
            include: {
                recipients: true
            }
        });

        return message;
    }

    public async getMessages(jobId: number): Promise<any> {
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            throw new NotFoundError(ErrorMessages.JOB.NOT_FOUND);
        }

        const messages = await prisma.jobMessage.findMany({
            where: { job_id: jobId },
            include: {
                recipients: {
                    include: {
                        driver: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        return messages;
    }
}
