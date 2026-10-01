import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useModelMonitoring } from '@/hooks/useModelGovernance';
import { ModelMonitoring } from '@/services/model.service';
import { LABEL_SOURCE_NAMES } from './modelCardContent';
import { formatPct } from './format';

const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 12,
};
const AXIS_TICK = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' };
// Tooltip and legend text stays in text colours; the swatch carries the series identity.
const TOOLTIP_ITEM = { color: 'hsl(var(--foreground))' };
const legendText = (value: string) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MonitoringTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: m, isLoading } = useModelMonitoring(from || undefined, to || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Alerts scored from</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </label>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>All time</Button>
        )}
      </div>

      {isLoading || !m ? (
        <Skeleton className="h-96" />
      ) : m.totalAlerts === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">No alerts were scored in this period.</p>
      ) : (
        <MonitoringBody m={m} />
      )}
    </div>
  );
}

function MonitoringBody({ m }: { m: ModelMonitoring }) {
  const decided = m.bands.reduce((n, b) => n + b.confirmedSuspicious + b.falsePositive, 0);
  const bandRows = m.bands
    .filter((b) => b.confirmedSuspicious + b.falsePositive > 0)
    .map((b) => {
      const d = b.confirmedSuspicious + b.falsePositive;
      return {
        band: b.band,
        confirmed: b.confirmedSuspicious / d,
        falsePositive: b.falsePositive / d,
        confirmedN: b.confirmedSuspicious,
        falsePositiveN: b.falsePositive,
        decided: d,
      };
    });
  const dist = m.scoreDistribution.map((d) => ({ ...d, mid: d.from + 5, label: `${d.from}–${d.to}` }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Alerts scored" value={m.totalAlerts.toLocaleString('en-IN')} />
        <Stat label="Decided by investigators" value={decided.toLocaleString('en-IN')}
              hint={`${formatPct(decided / m.totalAlerts)} of alerts in this period`} />
        <Stat label="New investigator labels" value={m.investigatorLabelsSinceActiveModel}
              hint="Since the active model was trained (all time)" />
        <Stat label="Scored by"
              value={m.scoredBy.length === 1 ? m.scoredBy[0].modelVersion : `${m.scoredBy.length} versions`}
              hint={m.scoredBy.map((s) => `${s.modelVersion}: ${s.alerts}`).join(' · ')} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Investigator outcomes by priority band</CardTitle>
          <CardDescription>
            Of the alerts investigators have decided, the share confirmed suspicious. A model that ranks well shows
            a higher confirmed share in HIGH than in MEDIUM, and in MEDIUM than in LOW.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bandRows.length > 0 && (
            <div style={{ height: 56 + bandRows.length * 44 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandRows} layout="vertical" stackOffset="expand"
                          margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => formatPct(v)} tick={AXIS_TICK}
                         axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="band" width={72} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                         axisLine={false} tickLine={false} />
                  <Legend verticalAlign="top" align="left" iconType="square" height={28}
                          wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={TOOLTIP_ITEM}
                    formatter={(val: number, name: string, item: any) => {
                      const n = name === 'Confirmed suspicious' ? item.payload.confirmedN : item.payload.falsePositiveN;
                      return [`${formatPct(val)} (${n} of ${item.payload.decided})`, name];
                    }}
                  />
                  <Bar dataKey="confirmed" name="Confirmed suspicious" stackId="o" fill="var(--viz-1)"
                       stroke="hsl(var(--card))" strokeWidth={2} radius={[4, 0, 0, 4]} barSize={24}>
                    <LabelList dataKey="confirmed" position="insideLeft" formatter={(v: number) => formatPct(v)}
                               style={{ fontSize: 12, fill: '#ffffff', fontWeight: 600 }} />
                  </Bar>
                  <Bar dataKey="falsePositive" name="False positive" stackId="o" fill="var(--viz-2)"
                       stroke="hsl(var(--card))" strokeWidth={2} radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Band</TableHead>
                <TableHead className="text-right">Alerts</TableHead>
                <TableHead className="text-right">Confirmed suspicious</TableHead>
                <TableHead className="text-right">False positive</TableHead>
                <TableHead className="text-right">Not yet decided</TableHead>
                <TableHead className="text-right">Confirmed share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.bands.map((b) => (
                <TableRow key={b.band}>
                  <TableCell className="font-medium">{b.band}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.alerts}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.confirmedSuspicious}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.falsePositive}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.undecided}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(b.confirmedRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority score distribution</CardTitle>
          <CardDescription>
            Alerts per 10-point score range, with the MEDIUM ({m.thresholds.medium}) and HIGH ({m.thresholds.high})
            thresholds. Scores bunched in one band mean the score separates alerts poorly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} margin={{ left: 0, right: 16, top: 24, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="mid" domain={[0, 100]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                       tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM}
                  labelFormatter={(_, p: any) => (p?.[0] ? `Score ${p[0].payload.label}` : '')}
                  formatter={(val: number) => [val, 'Alerts']}
                />
                <Bar dataKey="alerts" name="Alerts" fill="var(--viz-1)" radius={[4, 4, 0, 0]}
                     stroke="hsl(var(--card))" strokeWidth={2} />
                <ReferenceLine x={m.thresholds.medium} stroke="hsl(var(--foreground))" strokeDasharray="4 4"
                               label={{ value: `MEDIUM ≥ ${m.thresholds.medium}`, position: 'top', fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                <ReferenceLine x={m.thresholds.high} stroke="hsl(var(--foreground))" strokeDasharray="4 4"
                               label={{ value: `HIGH ≥ ${m.thresholds.high}`, position: 'top', fontSize: 11, fill: 'hsl(var(--foreground))' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Month by month</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Alerts</TableHead>
                  <TableHead className="text-right">Avg score</TableHead>
                  <TableHead className="text-right">HIGH / MED / LOW</TableHead>
                  <TableHead className="text-right">Confirmed / FP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.monthly.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.alerts}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avgPriorityScore ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.high} / {r.medium} / {r.low}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.confirmedSuspicious} / {r.falsePositive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top dismissal reasons</CardTitle>
            <CardDescription>Reasons investigators gave when dismissing alerts in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {m.dismissalReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dismissals in this period.</p>
            ) : (
              <Table>
                <TableBody>
                  {m.dismissalReasons.map((r) => (
                    <TableRow key={r.reason}>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell className="w-16 text-right tabular-nums">{r.alerts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training labels available</CardTitle>
          <CardDescription>All labelled alerts the next retrain would learn from (all time).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Suspicious</TableHead>
                <TableHead className="text-right">False positive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(m.labelsBySource).map(([src, c]) => (
                <TableRow key={src}>
                  <TableCell>{LABEL_SOURCE_NAMES[src] ?? src}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.TRUE_POSITIVE}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.FALSE_POSITIVE}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
