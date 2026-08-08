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
  /** Present when MAIL_DRIVER=log (local/dev) so reset works without SMTP */
  resetUrl?: string;
  devHint?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export type LoginResponse = AuthResponse;
export type RegisterResponse = AuthResponse;
