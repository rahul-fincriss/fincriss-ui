import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ModelStatus } from '@/services/model.service';
import { RuleConfig } from '@/services/rules.service';
import {
  MODEL_FEATURES,
  MODEL_GOVERNANCE,
  MODEL_LIMITATIONS,
  MODEL_PURPOSE,
} from './modelCardContent';
import { formatGovDate } from './format';

interface Props {
  status: ModelStatus;
  rules?: RuleConfig[];
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}

export function ModelCardTab({ status, rules }: Props) {
  const active = status.activeVersion;
  const groups = Array.from(new Set(MODEL_FEATURES.map((f) => f.group)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purpose and intended use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Bullets items={MODEL_PURPOSE} />
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Active version</dt>
              <dd className="font-medium">{active?.version ?? 'None registered'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Algorithm</dt>
              <dd className="font-medium">{active?.modelType ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trained</dt>
              <dd className="font-medium">{formatGovDate(active?.trainedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Live since</dt>
              <dd className="font-medium">{formatGovDate(active?.activatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inputs</dt>
              <dd className="font-medium">{MODEL_FEATURES.length} features</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How an alert's priority is calculated</CardTitle>
          <CardDescription>The rules and the model are combined into one 0–100 priority score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="rounded-md border bg-muted/40 px-4 py-3 font-mono">
            priority = {status.ruleWeight} × rule score + {status.mlWeight} × model probability × 100
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">HIGH: {status.highThreshold} and above</Badge>
            <Badge variant="outline">MEDIUM: {status.mediumThreshold}–{status.highThreshold - 1}</Badge>
            <Badge variant="outline">LOW: below {status.mediumThreshold}</Badge>
          </div>
          {rules && rules.length > 0 && (
            <div>
              <p className="mb-2 text-muted-foreground">
                Rules contributing to the rule score ({rules.filter((r) => r.is_enabled).length} of {rules.length} enabled):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rules.map((r) => (
                  <Badge key={r.rule_id} variant={r.is_enabled ? 'secondary' : 'outline'}
                         className={r.is_enabled ? '' : 'text-muted-foreground line-through'}>
                    {r.rule_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model inputs</CardTitle>
          <CardDescription>
            Structured data only. Customer activity figures are computed from the customer's transaction history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Group</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Meaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.flatMap((g) =>
                MODEL_FEATURES.filter((f) => f.group === g).map((f, i) => (
                  <TableRow key={f.feature}>
                    <TableCell className="text-muted-foreground">{i === 0 ? g : ''}</TableCell>
                    <TableCell className="font-medium">{f.label}</TableCell>
                    <TableCell className="text-muted-foreground">{f.description}</TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Change control</CardTitle>
          </CardHeader>
          <CardContent><Bullets items={MODEL_GOVERNANCE} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Known limitations</CardTitle>
          </CardHeader>
          <CardContent><Bullets items={MODEL_LIMITATIONS} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
