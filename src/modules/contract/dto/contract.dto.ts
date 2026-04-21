import { CreditTerms, ContractStatus, BillingType, TollHandling, ContractType, ApprovalStatus, GstStatus } from '../../../../generated/prisma';



export interface ICreateContractDTO {
    companyName: string;             // → TipCompany.tip_name
    abn?: string;                // → TipCompany.abn
    address?: string;            // → TipCompany.address
    phone?: string;              // → TipCompany.phone
    countryCode?: string;        // → TipCompany.country_code
    contractType?: ContractType;
    email: string;
    gstStatus?: GstStatus;     // → Client.gst_status
    creditTerms?: CreditTerms; // → Client.credit_terms
    creditScore?: number;     // → Client.credit_score (default 0)
}


export interface IUpdateContractDTO {
    contractTitle?: string;
    startDate?: string;
    endDate?: string;
    specialTerms?: string;
    contractManagerId?: number;
    status?: ContractStatus;
    contractContactName?: string;
    contractContactEmail?: string;
    contractContactPhone?: string;
    companyName: string;
    email: string;
    address?: string;
    phone?: string;              // → TipCompany.phone
    countryCode?: string;        // → TipCompany.country_code
    abn?: string;
    contractType?: ContractType;
    gstStatus?: GstStatus;     // → Client.gst_status
    creditTerms?: CreditTerms; // → Client.credit_terms
    creditScore?: number;     // → Client.credit_score (default 0)
}










// export interface IUpdateContractDTO extends Partial<Omit<ICreateContractDTO, 'contractNumber' | 'clientId'>> { }

// ─── Update Status ──────────────────────────────────────────────────
export interface IUpdateContractStatusDTO {
    status: ContractStatus;
}

export interface IUpdateContractApprovalStatusDTO {
    status: ApprovalStatus;
    reason?: string;
}

// ─── Query (paginated list) ───────────────────────────────────────────────────
export interface IGetContractsQuery {
    page?: number;
    limit?: number;
    status?: ContractStatus;
    clientId?: number;
    search?: string;
    approval?: ApprovalStatus;
    contractType?: ContractType;
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

