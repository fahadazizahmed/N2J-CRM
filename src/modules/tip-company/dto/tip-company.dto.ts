import { TipStatusType } from '../../../common/types/tip-company.types';

// ─── Create ───────────────────────────────────────────────────────────────────
export interface ICreateTipCompanyDTO {
    tipName: string;             // → TipCompany.tip_name
    abn?: string;                // → TipCompany.abn
    address?: string;            // → TipCompany.address
    phone?: string;              // → TipCompany.phone
    countryCode?: string;        // → TipCompany.country_code
    status: TipStatusType;       // → TipCompany.status
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface IUpdateTipCompanyDTO {
    tipName?: string;
    abn?: string;
    address?: string;
    phone?: string;
    countryCode?: string;
    status?: TipStatusType;
}

// ─── Query (paginated list) ───────────────────────────────────────────────────
export interface IGetTipCompaniesQuery {
    page?: number;
    limit?: number;
    status?: TipStatusType;
    search?: string;
}
