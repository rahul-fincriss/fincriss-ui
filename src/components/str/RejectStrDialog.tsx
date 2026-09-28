import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRejectStr } from '@/hooks/useSTR';

interface RejectStrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strId: number;
  caseId?: string | number;
}

const MIN_REASON = 10;

export function RejectStrDialog({ open, onOpenChange, strId, caseId }: RejectStrDialogProps) {
  const [reason, setReason] = useState('');
  const reject = useRejectStr();
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON;

  const handleOpenChange = (next: boolean) => {
    if (next) setReason('');
    onOpenChange(next);
  };

  const handleReject = () => {
    if (!valid) return;
    reject.mutate(
      { strId, reason: trimmed, caseId },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject STR</DialogTitle>
          <DialogDescription>
            Rejecting returns the case to the investigator. A reason (min {MIN_REASON} characters)
            is required and recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="str-reject-reason">Reason for rejection</Label>
          <Textarea
            id="str-reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Narrative lacks detail on the source of funds; add counterparty analysis."
            autoFocus
          />
          {!valid && trimmed.length > 0 && (
            <p className="text-xs text-destructive">Reason must be at least {MIN_REASON} characters.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={!valid || reject.isPending}>
            {reject.isPending ? 'Rejecting…' : 'Reject STR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
