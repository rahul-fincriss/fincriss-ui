import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService } from '@/services/user-management.service';
import { rolesService } from '@/services/roles.service';
import { toast } from 'sonner';

function errMsg(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
  return fallback;
}

const invalidateUsers = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['users'] });

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.listRoles(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; email: string; full_name: string; password: string; role_name?: string }) =>
      userManagementService.createUser(body),
    onSuccess: () => { invalidateUsers(qc); toast.success('User created'); },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to create user')),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email, full_name }: { userId: string; email?: string; full_name?: string }) =>
      userManagementService.updateUser(userId, { email, full_name }),
    onSuccess: () => { invalidateUsers(qc); toast.success('User updated'); },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to update user')),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      userManagementService.setActive(userId, active),
    onSuccess: (_, { active }) => { invalidateUsers(qc); toast.success(active ? 'User activated' : 'User deactivated'); },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to change user status')),
  });
}

export function useAssignUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      userManagementService.assignRole(userId, roleName),
    onSuccess: () => { invalidateUsers(qc); toast.success('Role assigned'); },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to assign role')),
  });
}

export function useRemoveUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: number }) =>
      userManagementService.removeRole(userId, roleId),
    onSuccess: () => { invalidateUsers(qc); toast.success('Role removed'); },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to remove role')),
  });
}
