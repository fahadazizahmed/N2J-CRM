import { CreditTerms, ContractStatus, BillingType, TollHandling } from '../../../../generated/prisma';

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

// ─── Update Status ──────────────────────────────────────────────────
export interface IUpdateContractStatusDTO {
    status: ContractStatus;
}

// ─── Query (paginated list) ───────────────────────────────────────────────────
export interface IGetContractsQuery {
    page?: number;
    limit?: number;
    status?: ContractStatus;
    clientId?: number;
    search?: string;
}

// ─── Contract Rate DTOs ───────────────────────────────────────────────────────

export interface IAddContractRateDTO {
    billingType: BillingType;
    rate: number;
    effectiveFrom: string;       // ISO8601 date string
    materialType?: string;
    minimumCharge?: number;
    tollHandling?: TollHandling;
}

export interface IChangeContractRateDTO {
    billingType: BillingType;
    rate: number;
    effectiveFrom: string;       // ISO8601 date of NEW rate — backend closes old rate automatically
    materialType?: string;
    minimumCharge?: number;
    tollHandling?: TollHandling;
}

export interface IUpdateContractRateDTO {
    billingType: BillingType;
    rate: number;
    effectiveFrom: string;       // ISO8601 date string
    materialType?: string;
    minimumCharge?: number;
    tollHandling?: TollHandling;
    effectiveTo: string;
}

