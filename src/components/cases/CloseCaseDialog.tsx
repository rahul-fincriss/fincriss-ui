import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CaseOutcome } from '@/services/cases.service';

interface CloseCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseLabel: string;
  onConfirm: (outcome: CaseOutcome, rationale: string) => void;
  isPending?: boolean;
}

const MIN_RATIONALE_LENGTH = 5;

export function CloseCaseDialog({
  open, onOpenChange, caseLabel, onConfirm, isPending,
}: CloseCaseDialogProps) {
  const [outcome, setOutcome] = useState<CaseOutcome | ''>('');
  const [rationale, setRationale] = useState('');
  const trimmed = rationale.trim();
  const valid = outcome !== '' && trimmed.length >= MIN_RATIONALE_LENGTH;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOutcome('');
      setRationale('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Case</DialogTitle>
          <DialogDescription>
            Closing <span className="font-mono">{caseLabel}</span> is final. The outcome and rationale are
            recorded in the audit trail and fed back as a label for model retraining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Outcome</Label>
            <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as CaseOutcome)}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="TRUE_POSITIVE" id="outcome-tp" className="mt-0.5" />
                <Label htmlFor="outcome-tp" className="font-normal">
                  <span className="font-medium">True positive</span> — suspicious activity confirmed
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="FALSE_POSITIVE" id="outcome-fp" className="mt-0.5" />
                <Label htmlFor="outcome-fp" className="font-normal">
                  <span className="font-medium">False positive</span> — activity explained, no further action
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="close-rationale">Rationale</Label>
            <Textarea
              id="close-rationale"
              placeholder="e.g. Funds traced to documented property sale; source of funds verified"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
            />
            {trimmed.length > 0 && trimmed.length < MIN_RATIONALE_LENGTH && (
              <p className="text-xs text-destructive">
                Rationale must be at least {MIN_RATIONALE_LENGTH} characters.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => outcome && onConfirm(outcome, trimmed)}
            disabled={!valid || isPending}
          >
            {isPending ? 'Closing…' : 'Close Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
