import { CreditTerms, ContractStatus } from '../../../../generated/prisma';

export interface ICreateContractDTO {
    clientId: number;
    contractNumber: string;
    contractTitle?: string;
    startDate: string;
    endDate: string;
    creditTermsOverride?: CreditTerms;
    specialTerms?: string;
    contractManagerId?: number;
    status?: ContractStatus;
}
