import { GstStatus, CreditTerms, ClientStatus } from '../../../../generated/prisma';

// ─── Create ───────────────────────────────────────────────────────────────────
// user_id is NOT included — it is auto-resolved inside the service (new User created)
export interface ICreateClientDTO {
    // ── Stored in User table ──────────────────────────────────────────
    clientName: string;       // → User.name
    email: string;            // → User.email

    // ── Stored in Client table ────────────────────────────────────────
    abn: string;
    address: string;
    phone: string;
    countryCode: string;      // → Client.country_code (also used for phone validation)
    gstStatus: GstStatus;     // → Client.gst_status
    creditTerms: CreditTerms; // → Client.credit_terms
    creditScore?: number;     // → Client.credit_score (default 0)
    status: ClientStatus;     // → Client.status
}

// ─── Update ───────────────────────────────────────────────────────────────────
// All fields are optional — only send what you want to change
export interface IUpdateClientDTO {
    clientName?: string;      // → Client.client_name + User.name (kept in sync)
    abn?: string;             // → Client.abn
    address?: string;         // → Client.address
    phone?: string;           // → Client.phone
    countryCode?: string;     // → Client.country_code
    gstStatus?: GstStatus;    // → Client.gst_status
    creditTerms?: CreditTerms;// → Client.credit_terms
    creditScore?: number;     // → Client.credit_score
    status?: ClientStatus;    // → Client.status
}

// ─── Query (paginated list) ───────────────────────────────────────────────────
export interface IGetClientsQuery {
    page?: number;
    limit?: number;
    status?: ClientStatus;
    search?: string;
}
