export type UserRole = 'Admin' | 'Organizer' | 'Audience' | 'Checker' | string;

export type User = {
  id: string;
  email: string;
  fullName: string;
  status?: 'PENDING' | 'ACTIVE' | string;
  roles: UserRole[];
  permissions: string[];
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type RegisterResponse = {
  id: string;
  email: string;
  fullName: string;
  status: 'PENDING' | 'ACTIVE' | string;
  roles: UserRole[];
};

export type ApiMessageResponse = {
  message: string;
};
