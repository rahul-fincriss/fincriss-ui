import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DismissAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertId: string;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

const MIN_REASON_LENGTH = 5;

export function DismissAlertDialog({
  open, onOpenChange, alertId, onConfirm, isPending,
}: DismissAlertDialogProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON_LENGTH;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm(trimmed);
  };

  // Reset the field whenever the dialog is opened fresh.
  const handleOpenChange = (next: boolean) => {
    if (next) setReason('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss Alert</DialogTitle>
          <DialogDescription>
            Dismissing <span className="font-mono">{alertId}</span> closes it without escalation.
            A reason is required and recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="dismiss-reason">Reason for dismissal</Label>
          <Textarea
            id="dismiss-reason"
            placeholder="e.g. False positive — transaction matches known payroll pattern"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
          {!valid && trimmed.length > 0 && (
            <p className="text-xs text-destructive">Reason must be at least {MIN_REASON_LENGTH} characters.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!valid || isPending}>
            {isPending ? 'Dismissing…' : 'Dismiss Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
