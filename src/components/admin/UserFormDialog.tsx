import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ManagedUser } from '@/types/admin';
import { useRoles, useCreateUser, useUpdateUser, useAssignUserRole, useRemoveUserRole } from '@/hooks/useUserManagement';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();

  const [form, setForm] = useState({
    username: '', email: '', full_name: '', password: '', role_name: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (user) {
      setForm({ username: user.username, email: user.email, full_name: user.name, password: '', role_name: '' });
      setSelectedRoles(user.roles || []);
    } else {
      setForm({ username: '', email: '', full_name: '', password: '', role_name: '' });
      setSelectedRoles([]);
    }
    setErrors({});
  }, [open, user]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2) e.full_name = 'Full name is required';
    if (!form.email.trim() || !emailRe.test(form.email)) e.email = 'Valid email is required';
    if (!isEdit) {
      if (!form.username.trim() || form.username.trim().length < 3) e.username = 'Username (min 3 chars) is required';
      if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pending = createUser.isPending || updateUser.isPending;

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isEdit) {
      await createUser.mutateAsync({
        username: form.username.trim(),
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
        role_name: form.role_name || undefined,
      });
      onOpenChange(false);
      return;
    }

    // Edit: update name/email, then reconcile roles.
    await updateUser.mutateAsync({ userId: user!.id, email: form.email.trim(), full_name: form.full_name.trim() });

    const original = new Set(user!.roles || []);
    const selected = new Set(selectedRoles);
    const toAdd = [...selected].filter((r) => !original.has(r as any));
    const toRemove = [...original].filter((r) => !selected.has(r as any));
    for (const roleName of toAdd) {
      await assignRole.mutateAsync({ userId: user!.id, roleName });
    }
    for (const roleName of toRemove) {
      const roleId = roles.find((r) => r.role_name === roleName)?.role_id;
      if (roleId) await removeRole.mutateAsync({ userId: user!.id, roleId });
    }
    onOpenChange(false);
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the user’s details and roles.' : 'Create a new platform user and assign an initial role.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="uf-fullname">Full name</Label>
            <Input id="uf-fullname" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="uf-email">Email</Label>
            <Input id="uf-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {!isEdit && (
            <>
              <div className="space-y-1">
                <Label htmlFor="uf-username">Username</Label>
                <Input id="uf-username" value={form.username} onChange={(e) => set('username', e.target.value)} />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="uf-password">Initial password</Label>
                <Input id="uf-password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-1">
                <Label>Initial role</Label>
                <Select value={form.role_name} onValueChange={(v) => set('role_name', v)}>
                  <SelectTrigger><SelectValue placeholder="Select a role (optional)" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.role_id} value={r.role_name}>{r.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isEdit && (
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <label key={r.role_id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedRoles.includes(r.role_name)}
                      onCheckedChange={() => toggleRole(r.role_name)}
                    />
                    {r.role_name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Username can’t be changed after creation.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
