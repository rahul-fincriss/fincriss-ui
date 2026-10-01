import { AlertTriangle, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvaluationMetrics, ModelVersion } from '@/services/model.service';
import { FEATURE_LABELS, LABEL_SOURCE_NAMES } from './modelCardContent';
import { formatAuc, formatGovDate, formatPct } from './format';

interface Props {
  versions: ModelVersion[];
  selected: string;
  onSelect: (version: string) => void;
  /** Hide the version picker (e.g. in the printed report). */
  showSelector?: boolean;
}

// ROC-AUC below this on investigator labels means the ranking is close to chance.
const WEAK_AUC = 0.6;

function MetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ConfusionMatrixGrid({ m }: { m: EvaluationMetrics }) {
  const c = m.confusionMatrix;
  const cell = 'border p-3 text-center tabular-nums';
  return (
    <table className="w-full max-w-md border-collapse text-sm">
      <thead>
        <tr>
          <th className="p-2" />
          <th className="p-2 font-medium text-muted-foreground">Model: suspicious</th>
          <th className="p-2 font-medium text-muted-foreground">Model: not suspicious</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className="p-2 text-left font-medium text-muted-foreground">Investigator: suspicious</th>
          <td className={cell}><span className="text-lg font-semibold">{c.tp}</span><br /><span className="text-xs text-muted-foreground">correctly caught</span></td>
          <td className={cell}><span className="text-lg font-semibold">{c.fn}</span><br /><span className="text-xs text-muted-foreground">missed</span></td>
        </tr>
        <tr>
          <th className="p-2 text-left font-medium text-muted-foreground">Investigator: false positive</th>
          <td className={cell}><span className="text-lg font-semibold">{c.fp}</span><br /><span className="text-xs text-muted-foreground">wrongly raised</span></td>
          <td className={cell}><span className="text-lg font-semibold">{c.tn}</span><br /><span className="text-xs text-muted-foreground">correctly cleared</span></td>
        </tr>
      </tbody>
    </table>
  );
}

export function ValidationTab({ versions, selected, onSelect, showSelector = true }: Props) {
  const v = versions.find((x) => x.version === selected);

  return (
    <div className="space-y-6">
      {showSelector && <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Model version</span>
        <Select value={selected} onValueChange={onSelect}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {versions.map((x) => (
              <SelectItem key={x.version} value={x.version}>
                {x.version} · {x.status.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>}

      {!v ? null : !v.metrics ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Validation results were not recorded when <strong>{v.version}</strong> was trained
            ({formatGovDate(v.trainedAt)}). They are not reconstructed after the fact. The first recorded
            validation will come from the next retrain, which is reviewed before it can go live.
          </AlertDescription>
        </Alert>
      ) : (
        <ValidationDetail v={v} />
      )}
    </div>
  );
}

function ValidationDetail({ v }: { v: ModelVersion }) {
  const m = v.metrics!;
  const primary = m.testSetAnalystOnly ?? m.testSet;
  const primaryLabel = m.testSetAnalystOnly ? 'investigator-labelled test alerts' : 'all test alerts';
  const weak = primary.rocAuc !== null && primary.rocAuc < WEAK_AUC;
  const top = v.featureImportance.slice(0, 10).map((f) => ({
    name: FEATURE_LABELS[f.feature] ?? f.feature,
    importance: f.importance,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Held-out test results</CardTitle>
          <CardDescription>
            Measured on {primary.samples} {primaryLabel} the model did not see in training
            ({m.trainSamples} alerts were used for training). Decision threshold {m.decisionThreshold}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weak && (
            <Alert className="border-status-warning/40">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              <AlertDescription>
                <strong>Weak ranking.</strong> A ROC-AUC of {formatAuc(primary.rocAuc)} on investigator labels is
                {primary.rocAuc < 0.5 ? ' worse than' : ' little better than'} random ordering, which scores 0.5.
                This version should not be approved without understanding why.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="ROC-AUC" value={formatAuc(primary.rocAuc)}
                        hint="Ranking quality: 0.5 = random, 1.0 = perfect" />
            <MetricTile label="Precision" value={formatPct(primary.precision)}
                        hint="Of alerts the model flagged, share confirmed suspicious" />
            <MetricTile label="Recall" value={formatPct(primary.recall)}
                        hint="Of confirmed suspicious alerts, share the model flagged" />
            <MetricTile label="F1 score" value={formatPct(primary.f1)}
                        hint="Balance of precision and recall" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test set</TableHead>
                <TableHead className="text-right">Alerts</TableHead>
                <TableHead className="text-right">ROC-AUC</TableHead>
                <TableHead className="text-right">Precision</TableHead>
                <TableHead className="text-right">Recall</TableHead>
                <TableHead className="text-right">F1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: 'Investigator labels only', e: m.testSetAnalystOnly },
                { name: 'All labels (incl. heuristic)', e: m.testSet },
              ].filter((r) => r.e).map(({ name, e }) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="text-right tabular-nums">{e!.samples}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAuc(e!.rocAuc)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(e!.precision)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(e!.recall)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(e!.f1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Heuristic labels come from the customer risk rating, which is also a model input, so results that include
            them are optimistic.
          </p>
          {m.comparison && (
            <div className="rounded-md border p-4 text-sm">
              <p className="font-medium">Compared with {m.comparison.version}, the live model when this was trained</p>
              {m.comparison.error ? (
                <p className="text-muted-foreground">{m.comparison.error}</p>
              ) : (
                <>
                  <p className="mt-1">
                    ROC-AUC on the same investigator-labelled test alerts:{' '}
                    <strong>{formatAuc(primary.rocAuc)}</strong> for {v.version} vs{' '}
                    <strong>{formatAuc((m.comparison.testSetAnalystOnly ?? m.comparison.testSet)?.rocAuc)}</strong>{' '}
                    for {m.comparison.version}
                    {m.worseThanActive && <span className="text-status-warning"> (this version ranks them worse)</span>}.
                  </p>
                  {m.comparison.note && <p className="mt-1 text-xs text-muted-foreground">{m.comparison.note}</p>}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Decisions vs investigators</CardTitle>
            <CardDescription>On the {primaryLabel}.</CardDescription>
          </CardHeader>
          <CardContent><ConfusionMatrixGrid m={primary} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training data</CardTitle>
            <CardDescription>Labelled alerts by where the label came from.</CardDescription>
          </CardHeader>
          <CardContent>
            {v.trainingData && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Suspicious</TableHead>
                    <TableHead className="text-right">False positive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(v.trainingData.bySource).map(([src, c]) => (
                    <TableRow key={src}>
                      <TableCell>{LABEL_SOURCE_NAMES[src] ?? src}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.TRUE_POSITIVE ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.FALSE_POSITIVE ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{v.trainingData.truePositive}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.trainingData.falsePositive}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {top.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most influential inputs</CardTitle>
            <CardDescription>Top 10 by the model's feature importance (shares of 1.0 across all 24 inputs).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                         axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                         axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(val: number) => [val.toFixed(3), 'Importance']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="importance" fill="var(--viz-1)" radius={[0, 4, 4, 0]} barSize={14}>
                    <LabelList dataKey="importance" position="right" formatter={(val: number) => val.toFixed(3)}
                               style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
