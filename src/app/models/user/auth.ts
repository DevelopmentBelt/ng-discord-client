import { User } from './user';

export interface LoginRequest {
  username?: string | null;
  email?: string | null;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message?: string;
  user?: User;
}

export type LoginResponse = AuthResponse;
export type RegisterResponse = AuthResponse;
