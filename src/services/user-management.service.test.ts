import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '@/lib/api-client';
import { userManagementService } from './user-management.service';

const g = api.get as unknown as ReturnType<typeof vi.fn>;
const p = api.post as unknown as ReturnType<typeof vi.fn>;
const put = api.put as unknown as ReturnType<typeof vi.fn>;
const patch = api.patch as unknown as ReturnType<typeof vi.fn>;
const del = api.delete as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => { [g, p, put, patch, del].forEach((m) => m.mockReset()); });

describe('userManagementService.listUsers', () => {
  it('normalizes users incl. roles + active status', async () => {
    g.mockResolvedValueOnce({ data: { users: [
      { user_id: 5, username: 'analyst1', email: 'a@x.com', full_name: 'Ann', is_active: true, roles: [{ role_name: 'analyst' }] },
    ] } });
    const [u] = await userManagementService.listUsers();
    expect(u.id).toBe('5');
    expect(u.name).toBe('Ann');
    expect(u.roles).toEqual(['analyst']);
    expect(u.status).toBe('active');
  });
});

describe('userManagementService mutations', () => {
  it('createUser POSTs the full body', async () => {
    p.mockResolvedValueOnce({ data: { user_id: 9 } });
    await userManagementService.createUser({ username: 'n', email: 'n@x.com', full_name: 'New', password: 'password123', role_name: 'analyst' });
    expect(p).toHaveBeenCalledWith('/api/users', { username: 'n', email: 'n@x.com', full_name: 'New', password: 'password123', role_name: 'analyst' });
  });

  it('updateUser PUTs name/email', async () => {
    put.mockResolvedValueOnce({ data: {} });
    await userManagementService.updateUser('5', { email: 'e@x.com', full_name: 'E' });
    expect(put).toHaveBeenCalledWith('/api/users/5', { email: 'e@x.com', full_name: 'E' });
  });

  it('setActive maps to activate/deactivate', async () => {
    patch.mockResolvedValue({ data: {} });
    await userManagementService.setActive('5', true);
    await userManagementService.setActive('5', false);
    expect(patch).toHaveBeenCalledWith('/api/users/5/activate');
    expect(patch).toHaveBeenCalledWith('/api/users/5/deactivate');
  });

  it('assignRole POSTs role_name; removeRole DELETEs by role_id', async () => {
    p.mockResolvedValueOnce({ data: {} });
    del.mockResolvedValueOnce({ data: {} });
    await userManagementService.assignRole('5', 'investigator');
    await userManagementService.removeRole('5', 3);
    expect(p).toHaveBeenCalledWith('/api/users/5/roles', { role_name: 'investigator' });
    expect(del).toHaveBeenCalledWith('/api/users/5/roles/3');
  });
});
