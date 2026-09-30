import { CaseStatus } from '@/types';

export function isCaseClosed(status: CaseStatus): boolean {
  return status === 'closed' || status === 'closed_false_positive';
}

// Mirrors the backend: a case can't be closed while its STR awaits approval.
export function canCloseCase(status: CaseStatus): boolean {
  return !isCaseClosed(status) && status !== 'under_review';
}
