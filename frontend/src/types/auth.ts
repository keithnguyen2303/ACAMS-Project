export const UserRole = {
    Adopter: "Adopter",
    Staff: "Staff",
    Admin: "Admin",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
    U_USERID: number;
    U_NAME: string;
    U_EMAIL: string;
    U_ROLE: UserRole;
}
