
export type GSTStatusType = 'pending' | 'approved' | 'notApproved'

export const GSTStatus: GSTStatusType[] = [
    'pending',
    'approved',
    'notApproved'
];

export type CreditTermsType = 'net_7' | 'net_14' | 'net_30' | 'net_60'

export const CreditTerms: CreditTermsType[] = [
    'net_7',
    'net_14',
    'net_30',
    'net_60'
];

export type ClientStatusType = 'pending' | 'active' | 'suspended'

export const ClientStatus: ClientStatusType[] = [
    'pending',
    'active',
    'suspended'
];
