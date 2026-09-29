import api from '@/lib/api-client';
import { ManagedUser } from '@/types/admin';
import { UserRole } from '@/types';

export const userManagementService = {
  async listUsers(_params?: Record<string, unknown>): Promise<ManagedUser[]> {
    const response = await api.get('/api/users');
    const data = response.data;
    console.log("userManagementService.listUsers raw data:", data);
    
    const users = Array.isArray(data) ? data : (data.users || data.items || data.data || []);
    return users.map((u: any) => {
      const roles = Array.isArray(u.roles) 
        ? u.roles.map((r: any) => (typeof r === 'string' ? r : r.role_name)) 
        : [u.roles || u.role].filter(Boolean) as UserRole[];
        
      return {
        id: (u.user_id || u.id).toString(),
        name: u.full_name || u.name || u.username,
        email: u.email,
        username: u.username,
        role: roles[0] || 'analyst', // For compatibility with User type
        roles: roles,
        status: u.is_active ? 'active' : 'inactive',
        department: u.department,
        team: u.team,
        assignedQueueIds: u.assigned_queue_ids || [],
        lastLogin: u.last_login ? new Date(u.last_login) : undefined,
        createdAt: new Date(u.created_at || Date.now()),
      };
    });
  },

  async createUser(body: {
    username: string; email: string; full_name: string; password: string; role_name?: string;
  }): Promise<any> {
    const response = await api.post('/api/users', body);
    return response.data;
  },

  // Update name/email only (username is immutable server-side).
  async updateUser(userId: string, body: { email?: string; full_name?: string }): Promise<any> {
    const response = await api.put(`/api/users/${userId}`, body);
    return response.data;
  },

  async setActive(userId: string, active: boolean): Promise<any> {
    const path = active ? 'activate' : 'deactivate';
    const response = await api.patch(`/api/users/${userId}/${path}`);
    return response.data;
  },

  async assignRole(userId: string, roleName: string): Promise<any> {
    const response = await api.post(`/api/users/${userId}/roles`, { role_name: roleName });
    return response.data;
  },

  async removeRole(userId: string, roleId: number): Promise<void> {
    await api.delete(`/api/users/${userId}/roles/${roleId}`);
  },
};
