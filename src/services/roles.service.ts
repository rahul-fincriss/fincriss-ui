import api from '@/lib/api-client';

export interface Permission {
  permission_id: number;
  resource_name: string;
  action_name: string;
  description?: string;
  _raw?: any;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string;
  permissions: Permission[];
}

export const rolesService = {
  async listRoles(): Promise<Role[]> {
    const response = await api.get('/api/roles');
    const d = response.data;
    const rawRoles = Array.isArray(d) ? d : (d?.roles || d?.data || d?.items || d?.user_roles || []);
    return rawRoles.map((r: any) => ({
      role_id: r.role_id || r.id || 0,
      role_name: r.role_name || r.name || 'unknown_role',
      description: r.description || '',
      permissions: (r.permissions || r.assigned_permissions || r.permission_ids || []).map((p: any) => {
        // If it's just an ID or string, wrap it as a partial permission object
        if (typeof p !== 'object' || p === null) {
          return { permission_id: Number(p), resource_name: 'Loading...', action_name: '...', _raw: p };
        }
        return {
          permission_id: p.permission_id || p.id || 0,
          resource_name: p.resource_name || p.resource || p.name || 'unknown',
          action_name: p.action_name || p.action || 'view',
          description: p.description || '',
          _raw: p
        };
      })
    }));
  },
  
  async createRole(roleName: string, description?: string): Promise<Role> {
    const response = await api.post('/api/roles', { role_name: roleName, description });
    return response.data;
  },
  
  async listPermissions(): Promise<Permission[]> {
    const response = await api.get('/api/permissions');
    const d = response.data;
    
    // CASE 1: Response is already a flat array
    if (Array.isArray(d)) {
      return d.map((p: any) => ({
        permission_id: p.permission_id || p.id || 0,
        resource_name: p.resource_name || p.resource || p.name || 'unknown',
        action_name: p.action_name || p.action || 'view',
        description: p.description || '',
        _raw: p
      }));
    }
    
    // CASE 2: Response is a nested array (e.g. { permissions: [...] })
    const rawPerms = (d?.permissions || d?.data || d?.items || d?.all_permissions);
    if (Array.isArray(rawPerms)) {
      return rawPerms.map((p: any) => ({
        permission_id: p.permission_id || p.id || 0,
        resource_name: p.resource_name || p.resource || p.name || 'unknown',
        action_name: p.action_name || p.action || 'view',
        description: p.description || '',
        _raw: p
      }));
    }
    
    // CASE 3: Response is a Matrix (e.g. { resources: [...], actions: [...], matrix: {...} })
    if (d?.matrix && d?.resources) {
      const permissions: Permission[] = [];
      Object.entries(d.matrix).forEach(([resource, actionsMap]: [string, any]) => {
        Object.entries(actionsMap).forEach(([action, value]: [string, any]) => {
          // Flatten the ID if it's nested in an object
          const id = (typeof value === 'object' && value !== null) 
            ? (value.permission_id || value.id || value.pk || 0) 
            : value;
            
          permissions.push({
            permission_id: Number(id),
            resource_name: resource,
            action_name: action,
            description: `Permission to ${action} ${resource}`,
            _raw: { resource, action, value }
          });
        });
      });
      return permissions;
    }
    
    return [];
  },
  
  async assignPermission(roleId: number, permissionId: number): Promise<void> {
    await api.post(`/api/roles/${roleId}/permissions`, { permission_id: permissionId });
  },
  
  async removePermission(roleId: number, permissionId: number): Promise<void> {
    await api.delete(`/api/roles/${roleId}/permissions/${permissionId}`);
  },

  async deleteRole(roleId: number): Promise<void> {
    await api.delete(`/api/roles/${roleId}`);
  }
};
