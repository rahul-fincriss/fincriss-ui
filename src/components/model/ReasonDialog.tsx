import { ReactNode, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const MIN_LENGTH = 10;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  label: string;
  placeholder: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: (text: string) => void;
}

/** A confirm dialog that requires a written reason, recorded in the audit trail. */
export function ReasonDialog({
  open, onOpenChange, title, description, label, placeholder, confirmLabel, destructive, pending, onConfirm,
}: Props) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const valid = trimmed.length >= MIN_LENGTH;

  const handleOpenChange = (next: boolean) => {
    if (next) setText('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild><div>{description}</div></DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason-dialog-text">{label}</Label>
          <Textarea id="reason-dialog-text" value={text} onChange={(e) => setText(e.target.value)}
                    rows={4} placeholder={placeholder} autoFocus />
          {!valid && trimmed.length > 0 && (
            <p className="text-xs text-destructive">At least {MIN_LENGTH} characters.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={!valid || pending}
                  onClick={() => onConfirm(trimmed)}>
            {pending ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
