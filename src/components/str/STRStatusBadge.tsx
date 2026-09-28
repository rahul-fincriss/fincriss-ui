import { Badge } from '@/components/ui/badge';
import { STRWorkflowStatus } from '@/services/str.service';

const CONFIG: Record<STRWorkflowStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-status-in-progress/20 text-status-in-progress' },
  APPROVED: { label: 'Approved', className: 'bg-risk-low/20 text-risk-low' },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/15 text-destructive' },
  SUBMITTED: { label: 'Submitted', className: 'bg-primary/20 text-primary' },
};

export function STRStatusBadge({ status }: { status: STRWorkflowStatus }) {
  const c = CONFIG[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return <Badge className={c.className}>{c.label}</Badge>;
}
