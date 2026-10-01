import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentSettings, useUpdateAgentSettings } from '@/hooks/useAgent';

/** The first real Settings tab: the FinCrisS Agent's free-text questions (super admin only). */
export function AgentSettingsTab() {
  const { data, isLoading } = useAgentSettings(true);
  const update = useUpdateAgentSettings();
  const [enabled, setEnabled] = useState(true);
  const [limit, setLimit] = useState('30');

  useEffect(() => {
    if (data) { setEnabled(data.enabled); setLimit(String(data.hourlyLimit)); }
  }, [data]);

  if (isLoading || !data) return <Skeleton className="h-64" />;

  const n = Number(limit);
  const valid = Number.isInteger(n) && n >= 1 && n <= 1000;
  const dirty = enabled !== data.enabled || n !== data.hourlyLimit;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />FinCrisS Agent</CardTitle>
          <CardDescription>
            Free-text questions about alerts and cases, answered with each user's own access rights. Customer
            identities are masked before anything is sent to the AI provider. Quick actions keep working when
            free text is off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="agent-enabled">Free-text questions</Label>
              <p className="text-sm text-muted-foreground">Turn off to stop all calls to the AI provider from the assistant.</p>
            </div>
            <Switch id="agent-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-limit">Questions per user per hour</Label>
            <Input id="agent-limit" type="number" min={1} max={1000} value={limit}
                   onChange={(e) => setLimit(e.target.value)} className="w-32" />
            {!valid && <p className="text-xs text-destructive">A whole number from 1 to 1000.</p>}
            <p className="text-xs text-muted-foreground">Controls AI spend. Each question costs one, whatever the role.</p>
          </div>
          <Button disabled={!valid || !dirty || update.isPending}
                  onClick={() => update.mutate({ enabled, hourlyLimit: n })}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last 24 hours</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[
            ['Questions', data.last24h.questions],
            ['People asking', data.last24h.users],
            ['AI tokens used', data.last24h.tokens.toLocaleString('en-IN')],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
