import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateContractDTO } from '../dto/contract.dto';
import { ClientContract, ClientStatus, ContractStatus, SequenceEntity } from '../../../../generated/prisma';
import { generateContractNumber } from '../helper';
import InfoMessages from '../../../common/constant/messages';
import { generateEntityCode } from '../../../helper/helper.method';

export interface IAdminContractService {
    createContract(dto: ICreateContractDTO, actorId: number | null): Promise<ClientContract>;
}

export default class AdminContractService implements IAdminContractService {
    public async createContract(
        dto: ICreateContractDTO,
        actorId: number | null
    ): Promise<ClientContract> {
        const {
            clientId,
            contractTitle,
            startDate,
            endDate,
            creditTermsOverride,
            specialTerms,
            contractManagerId } = dto;

        // ── 1. Validate Client Exists and Get Default Credit Terms ──
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, credit_terms: true, status: true },
        });

        if (!client) {
            throw new NotFoundError(ErrorMessages.CLIENT.CLIENT_NOT_FOUND);
        }

        if (client.status !== ClientStatus.active) {
            throw new BadRequestError(ErrorMessages.CLIENT.CLIENT_NOT_ACTIVE);
        }

        // ── 3. Handle Contract Manager defaults & admin role check ──
        let managerIdToUse = contractManagerId;


        // Provided, so we must check if manager is admin
        const manager = await prisma.user.findUnique({
            where: { id: managerIdToUse },
            include: { roles: true },
        });

        if (!manager) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract manager'))
        }

        if (manager.status !== 1) {
            throw new NotFoundError(ErrorMessages.CONTRACT.CONTRACT_MANAGER_NOT_ACTIVE);
        }

        const isAdmin = manager.roles.some((r) => r.name.toLowerCase() === constant.ROLES.ADMIN);
        if (!isAdmin) {
            throw new BadRequestError(ErrorMessages.CONTRACT.INVALID_CONTRACT_MANAGER);
        }


        // ── 4. Set final credit terms ──
        const finalCreditTerms = creditTermsOverride || client.credit_terms;

        // ── 5. Create the Contract and Audit Log in a Transaction ──
        const contract = await prisma.$transaction(async (tx) => {

            const contractNumber = await generateEntityCode({
                tx,
                entity: SequenceEntity.CONTRACT,
                prefix: constant.CODE_PREFIX.CONTRACT,
            });


            const newContract = await tx.clientContract.create({
                data: {
                    client_id: clientId,
                    contract_number: contractNumber,
                    contract_title: contractTitle,
                    start_date: new Date(startDate),
                    end_date: new Date(endDate),
                    credit_terms_override: finalCreditTerms,
                    special_terms: specialTerms,
                    contract_manager_id: contractManagerId,
                    created_by: actorId,
                    status: ContractStatus.draft,
                },
            });
            return newContract;
        });

        // Fire-and-forget audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.CONTRACT,
            entity_id: contract.id,
            metadata: {
                client_id: contract.client_id,
                contract_number: contract.contract_number,
                contractManagerId: contractManagerId,
                action: InfoMessages.LOGGER_MESSAGE.CONTRACT_GENERATE_INFOT_CREATED_SUCCESSFULLY
            },
        })

        return contract;
    }
}
