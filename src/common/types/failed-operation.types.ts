export enum OperationType {
    EMAIL = 'EMAIL',
    AUDIT_LOG = 'AUDIT_LOG'
}

export enum OperationStatus {
    PENDING = 'PENDING',
    RETRIED = 'RETRIED',
    RESOLVED = 'RESOLVED',
    ABANDONED = 'ABANDONED'
}

export interface ICreateFailedOperation {
    operation_type: OperationType;
    entity_type: string;
    entity_id?: number;
    payload: any;
    error_message?: string;
}
