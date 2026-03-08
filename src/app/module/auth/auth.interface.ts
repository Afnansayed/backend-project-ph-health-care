export interface IRegisterPatient {
    name: string;
    email: string;
    password: string;
}

export interface IloginUser  {
    email: string;
    password: string;
}

export interface IChangePassword {
    currentPassword: string;
    newPassword: string;
}   