import { GstStatus, CreditTerms, ClientStatus } from '../../../../generated/prisma';

// user_id NOT included — auto-extracted from JWT token in controller
export interface ICreateClientDTO {
    company_name: string;
    abn?: string;
    address?: string;
    phone?: string;
    gst_approved: GstStatus;
    credit_terms: CreditTerms;
    credit_score?: number;
    status: ClientStatus;
}

export interface IUpdateClientDTO {
    company_name?: string;
    abn?: string;
    address?: string;
    phone?: string;
    gst_approved?: GstStatus;
    credit_terms?: CreditTerms;
    credit_score?: number;
    status?: ClientStatus;
}

export interface IGetClientsQuery {
    page?: number;
    limit?: number;
    status?: ClientStatus;
    search?: string;
}
