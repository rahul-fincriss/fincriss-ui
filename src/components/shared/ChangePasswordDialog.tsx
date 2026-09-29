import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN = 8;

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };
  const handleOpenChange = (o: boolean) => { if (o) reset(); onOpenChange(o); };

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < MIN;
  const valid = current.length > 0 && next.length >= MIN && next === confirm;

  const handleSubmit = async () => {
    if (!valid) return;
    setPending(true);
    try {
      await authService.changePassword(current, next);
      toast.success('Password changed');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to change password');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one (min {MIN} characters).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cp-current">Current password</Label>
            <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-new">New password</Label>
            <Input id="cp-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            {tooShort && <p className="text-xs text-destructive">Must be at least {MIN} characters.</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {mismatch && <p className="text-xs text-destructive">Passwords don’t match.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || pending}>
            {pending ? 'Changing…' : 'Change Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
