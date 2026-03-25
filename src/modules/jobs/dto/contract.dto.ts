import { CreditTerms, ContractStatus, BillingType, TollHandling, ContractType, ApprovalStatus, JobPriority, QuantityUnit, JobStatus } from '../../../../generated/prisma';



export interface ICreateJobDTO {
    clientId: number;
    tipId: number;
    contractId?: number;
    vehicleId: number;
    driverId: number;
    pickUpAddress: string;
    entryDate: string;
    deliveryDate: string;
    material: string;
    quantity: number;
    quantityUnit: QuantityUnit;
    rate: number;
    billingType: BillingType;
    notes?: string;
    priority: JobPriority;
}

export interface IUpdateJobDTO extends Partial<ICreateJobDTO> {
    status?: JobStatus;
}

export interface IGetJobsQuery {
    page?: number;
    limit?: number;
    status?: JobStatus;
    clientId?: number;
    driverId?: number;
    vehicleId?: number;
    search?: string;
    priority?: JobPriority;
}


// export interface IUpdateContractDTO {
//     contractTitle?: string;
//     startDate?: string;
//     endDate?: string;
//     specialTerms?: string;
//     contractManagerId?: number;
//     status?: ContractStatus;
//     contractContactName?: string;
//     contractContactEmail?: string;
//     contractContactPhone?: string;
//     companyName: string;
//     email: string;
//     address?: string;
//     phone?: string;              // → TipCompany.phone
//     countryCode?: string;        // → TipCompany.country_code
//     abn?: string;
//     contractType?: ContractType;
// }










// // export interface IUpdateContractDTO extends Partial<Omit<ICreateContractDTO, 'contractNumber' | 'clientId'>> { }

// // ─── Update Status ──────────────────────────────────────────────────
// export interface IUpdateContractStatusDTO {
//     status: ContractStatus;
// }

// export interface IUpdateContractApprovalStatusDTO {
//     status: ApprovalStatus;
//     reason?: string;
// }

// // ─── Query (paginated list) ───────────────────────────────────────────────────
// export interface IGetContractsQuery {
//     page?: number;
//     limit?: number;
//     status?: ContractStatus;
//     clientId?: number;
//     search?: string;
//     approval?: ApprovalStatus;
//     contractType?: ContractType;
// }

// // ─── Contract Rate DTOs ───────────────────────────────────────────────────────

// export interface IAddContractRateDTO {
//     billingType: BillingType;
//     rate: number;
//     effectiveFrom: string;       // ISO8601 date string
//     materialType?: string;
//     minimumCharge?: number;
//     tollHandling?: TollHandling;
// }

// export interface IChangeContractRateDTO {
//     billingType: BillingType;
//     rate: number;
//     effectiveFrom: string;       // ISO8601 date of NEW rate — backend closes old rate automatically
//     materialType?: string;
//     minimumCharge?: number;
//     tollHandling?: TollHandling;
// }

// export interface IUpdateContractRateDTO {
//     billingType: BillingType;
//     rate: number;
//     effectiveFrom: string;       // ISO8601 date string
//     materialType?: string;
//     minimumCharge?: number;
//     tollHandling?: TollHandling;
//     effectiveTo: string;
// }

