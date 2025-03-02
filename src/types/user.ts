export interface User {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    createdAt: Date;
}

export const users: User[] = [];
