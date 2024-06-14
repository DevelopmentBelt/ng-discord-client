export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
export interface LoginResponse {}
export interface RegisterResponse {}
