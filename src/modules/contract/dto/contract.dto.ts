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
    contractContactName?: string;
    contractContactEmail?: string;
    contractContactPhone?: string;
}

export interface IUpdateContractDTO extends Partial<Omit<ICreateContractDTO, 'contractNumber' | 'clientId'>> { }
