import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Circle, FileSignature, Loader2, Pencil, RefreshCw, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCaseNarrative, useGenerateCaseNarrative, useSaveCaseNarrative } from '@/hooks/useCaseNarrative';
import { useCreateStrDraft, useStrByCase, useUpdateStrDraft } from '@/hooks/useSTR';
import { canWriteCases, canWriteStr } from '@/lib/permissions';
import { isCaseClosed } from '@/lib/caseStatus';
import { NARRATIVE_SECTIONS, NarrativeSections } from '@/services/caseNarrative.service';
import { Case } from '@/types';
import { format } from 'date-fns';

interface InputCounts {
  alerts: number;
  transactions: number;
  notes: number;
  riskProfile: boolean;
  frozenFindings: boolean;
}

function liveInputs(caseData: Case): InputCounts {
  return {
    alerts: caseData.linkedAlerts.length,
    transactions: caseData.transactions.length,
    notes: caseData.notes.length,
    riskProfile: !!caseData.customerRiskRating,
    frozenFindings: !!caseData.frozenFindings,
  };
}

function InputsChecklist({ inputs }: { inputs: InputCounts }) {
  const items = [
    { ok: inputs.alerts > 0, label: `${inputs.alerts} alert${inputs.alerts === 1 ? '' : 's'}` },
    { ok: inputs.transactions > 0, label: `${inputs.transactions} transaction${inputs.transactions === 1 ? '' : 's'}` },
    { ok: inputs.notes > 0, label: `${inputs.notes} investigation note${inputs.notes === 1 ? '' : 's'}` },
    { ok: inputs.riskProfile, label: 'Customer risk profile (KYC, screening, declared vs observed)' },
    { ok: inputs.frozenFindings, label: 'Rule & ML findings frozen at escalation' },
  ];
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          {i.ok
            ? <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
            : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
          <span className={i.ok ? '' : 'text-muted-foreground'}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Highlighted entry point at the top of the case Overview. */
export function CaseNarrativeTeaser({ caseData, onOpen }: { caseData: Case; onOpen: () => void }) {
  const { data } = useCaseNarrative(caseData.id);
  const current = data?.current;
  const inputs = liveInputs(caseData);

  return (
    <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <CardContent className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Case Narrative
            {current && <Badge variant="outline">v{current.version}</Badge>}
          </p>
          {current ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {current.sections.grounds_of_suspicion}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Draft an STR-ready narrative from {inputs.alerts} alert{inputs.alerts === 1 ? '' : 's'},{' '}
              {inputs.transactions} transaction{inputs.transactions === 1 ? '' : 's'}, {inputs.notes} investigation
              note{inputs.notes === 1 ? '' : 's'} and the customer's risk profile — in seconds.
            </p>
          )}
        </div>
        <Button onClick={onOpen} className="shrink-0">
          <Sparkles className="mr-2 h-4 w-4" />
          {current ? 'Open narrative' : 'Generate narrative'}
        </Button>
      </CardContent>
    </Card>
  );
}

interface PanelProps {
  caseData: Case;
  onOpenStr: () => void;
}

export function CaseNarrativePanel({ caseData, onOpenStr }: PanelProps) {
  const { user } = useAuth();
  const canWrite = canWriteCases(user);
  const canStr = canWriteStr(user);

  const { data, isLoading } = useCaseNarrative(caseData.id);
  const { data: str } = useStrByCase(caseData.id);
  const generate = useGenerateCaseNarrative();
  const save = useSaveCaseNarrative();
  const createStr = useCreateStrDraft();
  const updateStr = useUpdateStrDraft();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NarrativeSections | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const current = data?.current ?? null;
  const versions = data?.versions ?? [];
  const inputs = liveInputs(caseData);
  const newNotesSince = current?.inputs ? inputs.notes - current.inputs.notes : 0;

  // Whether the narrative can go into an STR, and how.
  const strMode: 'create' | 'update' | null = (() => {
    if (!current || !canStr) return null;
    if (isCaseClosed(caseData.status) || caseData.status === 'under_review') return null;
    if (!str || str.status === 'REJECTED') return 'create';
    if (str.status === 'DRAFT') return 'update';
    return null;
  })();
  const strBlockedReason = !current
    ? null
    : !canStr
      ? 'You need STR write permission.'
      : isCaseClosed(caseData.status)
        ? 'The case is closed.'
        : str && ['PENDING_APPROVAL', 'APPROVED', 'SUBMITTED'].includes(str.status)
          ? `The STR is already ${str.status.replace(/_/g, ' ').toLowerCase()} and can't be edited.`
          : null;

  const runGenerate = () => generate.mutate(caseData.id, { onSuccess: () => setEditing(false) });

  const handleGenerateClick = () => {
    if (current?.source === 'EDITED') setConfirmRegenerate(true);
    else runGenerate();
  };

  const startEdit = () => {
    if (!current) return;
    setDraft({ ...current.sections, red_flags: [...current.sections.red_flags] });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!draft) return;
    save.mutate({ caseId: caseData.id, sections: draft }, { onSuccess: () => setEditing(false) });
  };

  const narrativeSource = current
    ? `${current.source === 'AI' ? 'AI' : 'AI_EDITED'}_CASE_NARRATIVE_v${current.version}`
    : undefined;

  const pushToStr = () => {
    if (!current) return;
    const onSuccess = () => onOpenStr();
    if (strMode === 'create') {
      createStr.mutate(
        { caseId: caseData.id, narrative: current.narrativeText, narrativeSource },
        { onSuccess }
      );
    } else if (strMode === 'update' && str) {
      updateStr.mutate(
        { strId: str.id, caseId: caseData.id, narrative: current.narrativeText, narrativeSource },
        { onSuccess }
      );
    }
  };

  const handleUseInStr = () => {
    if (strMode === 'update' && str?.narrative?.trim()) setConfirmOverwrite(true);
    else pushToStr();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading narrative…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Case Narrative
            </CardTitle>
            <CardDescription>
              An STR-ready narrative in FIU-IND sections, drafted from everything on this case.
              Customer names and account numbers are never sent to the model.
            </CardDescription>
          </div>
          {canWrite && !editing && (
            <Button onClick={handleGenerateClick} disabled={generate.isPending} className="shrink-0">
              {generate.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : current ? <RefreshCw className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generate.isPending ? 'Generating…' : current ? 'Regenerate' : 'Generate AI narrative'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">
            {current ? `Inputs used for v${current.version}` : 'Inputs the AI will use'}
          </p>
          <InputsChecklist inputs={current?.inputs ?? inputs} />
          {newNotesSince > 0 && (
            <p className="text-xs text-status-in-progress">
              {newNotesSince} note{newNotesSince === 1 ? ' has' : 's have'} been added since this version — regenerate to include {newNotesSince === 1 ? 'it' : 'them'}.
            </p>
          )}
          {!current && inputs.notes === 0 && (
            <p className="text-xs text-muted-foreground">
              Tip: add your investigation findings as case notes first — they become the "Investigation Findings" section.
            </p>
          )}
          {generate.isPending && (
            <div className="ai-generated rounded-lg p-4 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analysing {inputs.alerts} alert{inputs.alerts === 1 ? '' : 's'}, {inputs.transactions} transaction
              {inputs.transactions === 1 ? '' : 's'}, {inputs.notes} note{inputs.notes === 1 ? '' : 's'} and the customer's
              risk profile…
            </div>
          )}
        </CardContent>
      </Card>

      {current && !editing && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                Narrative v{current.version}
                <Badge variant={current.source === 'AI' ? 'default' : 'secondary'}>
                  {current.source === 'AI' ? 'AI-generated' : 'Edited by investigator'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {current.source === 'AI' ? 'Generated' : 'Saved'}
                {current.createdByName && ` by ${current.createdByName}`} on {format(current.createdAt, 'MMM dd, yyyy HH:mm')}
                {current.model && ` · ${current.model}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {canWrite && (
                <Button variant="outline" onClick={startEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
              {canStr && (
                <Button
                  onClick={handleUseInStr}
                  disabled={!strMode || createStr.isPending || updateStr.isPending}
                  title={strBlockedReason || undefined}
                >
                  <FileSignature className="mr-2 h-4 w-4" />
                  {createStr.isPending || updateStr.isPending ? 'Sending…' : 'Use in STR draft'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-status-in-progress/30 bg-status-in-progress/10 px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-status-in-progress" />
              AI-generated from de-identified case data. Review every statement against the evidence before filing.
            </div>
            {strBlockedReason && (
              <p className="text-xs text-muted-foreground">Can't send to the STR draft: {strBlockedReason}</p>
            )}
            {NARRATIVE_SECTIONS.map(({ key, label }) => (
              <div key={key} className="ai-generated rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{label}</p>
                <p className="text-sm whitespace-pre-wrap">{current.sections[key] || '—'}</p>
              </div>
            ))}
            {current.sections.red_flags.length > 0 && (
              <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-risk-high mb-2">Red flags</p>
                <ul className="list-disc pl-5 space-y-1">
                  {current.sections.red_flags.map((f, i) => <li key={i} className="text-sm">{f}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {current && editing && draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit narrative</CardTitle>
            <CardDescription>Saving creates version {current.version + 1}; earlier versions are kept.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {NARRATIVE_SECTIONS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`narr-${key}`}>{label}</Label>
                <Textarea
                  id={`narr-${key}`}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  rows={4}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="narr-flags">Red flags (one per line)</Label>
              <Textarea
                id="narr-flags"
                value={draft.red_flags.join('\n')}
                onChange={(e) => setDraft({ ...draft, red_flags: e.target.value.split('\n') })}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : `Save as v${current.version + 1}`}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Version history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.version} className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-foreground">v{v.version}</span>
                  <Badge variant="outline">{v.source === 'AI' ? 'AI' : 'Edited'}</Badge>
                  <span>{v.createdByName || 'Unknown'} · {format(v.createdAt, 'MMM dd, yyyy HH:mm')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the narrative?</AlertDialogTitle>
            <AlertDialogDescription>
              The current version includes your edits. Regenerating creates a new AI version — your edited
              version stays in the history, but it will no longer be the current narrative.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runGenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the STR draft narrative?</AlertDialogTitle>
            <AlertDialogDescription>
              The STR draft already has narrative text. It will be replaced with narrative v{current?.version}.
              The STR keeps a version count, and the change is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pushToStr}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
