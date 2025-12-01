// Animal types
export interface Animal {
    A_ANIMALID: number;
    A_NAME: string;
    A_SPECIES: string;
    A_BREED: string | null;
    A_STATUS: string;
    A_INTAKEDATE: string; // ISO date string
}

// Adoption Request types
export type AdoptionRequestStatus =
    | 'Submitted'
    | 'Under Review'
    | 'Approved'
    | 'Rejected'
    | 'Cancelled';

export interface AdoptionRequest {
    AR_USERID: number;
    AR_ANIMALID: number;
    AR_STATUS: AdoptionRequestStatus;
    AR_CREATEDAT: string;
    AR_UPDATEDAT: string;
}

// Request/Response types for API calls
export interface CreateAdoptionRequestBody {
    AR_USERID: number;
    AR_ANIMALID: number;
}

// User types
export type UserRole = 'Adopter' | 'Staff';

export interface AppUser {
    U_USERID: number;
    U_NAME: string;
    U_EMAIL: string;
    U_ROLE: UserRole;
}

// Medical Record types
export interface MedicalRecord {
    MR_RECORDID: number;
    MR_ANIMALID: number;
    MR_TREATMENTTYPE: string;
    MR_TREATMENTDATE: string; // ISO date string
}

// Intake Record types
export interface IntakeRecord {
    IR_INTAKEID: number;
    IR_ANIMALID: number;
    IR_INTAKETYPE: string;
    IR_INTAKEDATE: string; // ISO date string
    IR_CONDITION: string;
}
