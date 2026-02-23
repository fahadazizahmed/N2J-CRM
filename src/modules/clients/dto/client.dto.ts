import { GstStatus, CreditTerms, ClientStatus } from '../../../../generated/prisma';

export interface ICreateClientDTO {
    email: string;   // validated but NOT stored in clients table
    user_id: number;
    company_name: string;
    abn?: string;
    address?: string;
    phone?: string;
    gst_approved: GstStatus;
    credit_terms: CreditTerms;
    credit_score?: number;
    status: ClientStatus;
}
