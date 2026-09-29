import api from '@/lib/api-client';
import { User, UserRole } from '@/types';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string; // The API uses username, but the UI might collect email. We'll handle mapping if needed.
  password: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    // Map the API user response to our internal User type if necessary
    const apiUser = response.data;
    
    // Extract role - handle both string array and object array formats
    let userRole: UserRole = 'analyst';
    if (Array.isArray(apiUser.roles) && apiUser.roles.length > 0) {
      const firstRole = apiUser.roles[0];
      // If it's a string, use it. If it's an object, check for role_name
      if (typeof firstRole === 'string') {
        userRole = firstRole as UserRole;
      } else if (firstRole && typeof firstRole === 'object' && 'role_name' in firstRole) {
        userRole = firstRole.role_name as UserRole;
      }
    } else if (apiUser.role) {
      userRole = apiUser.role as UserRole;
    }

    return {
      id: (apiUser.user_id || apiUser.id || "unknown").toString(),
      name: apiUser.full_name || apiUser.username || apiUser.name || "Unknown User",
      email: apiUser.email || "",
      role: userRole,
      avatar: apiUser.avatar_url,
      permissions: Array.isArray(apiUser.permissions) ? apiUser.permissions : [],
    };
  },
};
