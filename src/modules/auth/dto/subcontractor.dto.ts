import { SubcontractorStatus } from '../../../../generated/prisma';

export interface ICreateSubcontractorDTO {
    companyName: string;
    phone?: string;
    countryCode?: string;
    abn?: string;
    address?: string;
    subcontractorContactName?: string;
    subcontractorContactEmail?: string;
    subcontractorContactPhone?: string;
    hourlyRate?: number;
    travelHoursRate?: number;
    perLoadRate?: number;
    perToneRate?: number;
    sendInvite?: boolean;
    notes?: string;
    email?: string;
    status?: SubcontractorStatus;
}

export interface IUpdateSubcontractorDTO {
    companyName?: string;
    phone?: string;
    countryCode?: string;
    abn?: string;
    address?: string;
    subcontractorContactName?: string;
    subcontractorContactEmail?: string;
    subcontractorContactPhone?: string;
    hourlyRate?: number;
    travelHoursRate?: number;
    perLoadRate?: number;
    perToneRate?: number;
    notes?: string;
    sendInvite?: boolean;
    email?: string;
    status?: SubcontractorStatus;
}

export interface IGetSubcontractorsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: SubcontractorStatus;
}

