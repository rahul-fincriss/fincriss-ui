import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  LucideIcon,
  Search,
  Zap,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/shared/MetricCard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardList, DashboardTile } from '@/services/dashboard.service';

// Icon and colour per tile key; anything unknown falls back to a neutral tile.
const TILE_STYLE: Record<string, { icon: LucideIcon; variant?: 'risk-high' | 'risk-medium' }> = {
  high_open: { icon: AlertTriangle, variant: 'risk-high' },
  my_high: { icon: AlertTriangle, variant: 'risk-high' },
  high_unassigned: { icon: AlertTriangle, variant: 'risk-high' },
  unassigned: { icon: Zap },
  my_open_alerts: { icon: Zap },
  in_progress: { icon: Search },
  my_in_review: { icon: Search },
  oldest_unassigned: { icon: Clock, variant: 'risk-medium' },
  my_decided: { icon: CheckCircle2 },
  open_cases: { icon: FolderOpen },
  my_open_cases: { icon: FolderOpen },
  cases_under_review: { icon: FolderOpen },
  pending_strs: { icon: FileText, variant: 'risk-medium' },
  strs_awaiting: { icon: FileText, variant: 'risk-medium' },
  my_str_drafts: { icon: FileText },
  strs_filed: { icon: FileText },
};

const age = (d: Date | null) => (d ? `${formatDistanceToNowStrict(d)} old` : '');

const SUBTITLE_BY_SCOPE: Record<string, string> = {
  bank: "Here's the bank-wide AML compliance overview",
  investigator: "Here's your investigation work for today",
  mine: "Here's your alert queue for today",
};

function Tile({ tile }: { tile: DashboardTile }) {
  const navigate = useNavigate();
  const style = TILE_STYLE[tile.key] ?? { icon: Inbox };
  const card = (
    <MetricCard title={tile.label} value={tile.value} subtitle={tile.subtitle} icon={style.icon}
                variant={style.variant} />
  );
  if (!tile.link) return card;
  return (
    <button type="button" className="text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => navigate(tile.link)}>
      {card}
    </button>
  );
}

const rowClass =
  'flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 table-row-interactive';

function ListRows({ list }: { list: DashboardList }) {
  const navigate = useNavigate();

  if (list.items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{list.empty}</p>;
  }

  switch (list.kind) {
    case 'alerts':
      return (
        <>
          {list.items.map((a) => (
            <div key={a.alertId} className={rowClass} onClick={() => navigate(`/alerts/${a.alertId}`)}>
              <div className="flex items-center gap-3">
                <RiskBadge level={a.riskLevel} size="sm" />
                <div>
                  <p className="font-mono text-sm">{a.alertId}</p>
                  <p className="text-sm text-muted-foreground">{a.customerName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{a.amount.toLocaleString('en-IN')} {a.currency}</p>
                <p className="text-xs text-muted-foreground">{age(a.alertDate)}</p>
              </div>
            </div>
          ))}
        </>
      );
    case 'cases':
      return (
        <>
          {list.items.map((c) => (
            <div key={c.caseId} className={rowClass} onClick={() => navigate(`/cases/${c.caseId}`)}>
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status} size="sm" />
                <div>
                  <p className="font-mono text-sm">{c.caseNumber}</p>
                  <p className="text-sm text-muted-foreground">{c.customerName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{c.amount.toLocaleString('en-IN')} {c.currency}</p>
                <p className="text-xs text-muted-foreground">{age(c.createdAt)}</p>
              </div>
            </div>
          ))}
        </>
      );
    case 'strs':
      return (
        <>
          {list.items.map((s) => (
            <div key={s.strId} className={rowClass} onClick={() => navigate(`/cases/${s.caseId}?tab=str-draft`)}>
              <div>
                <p className="font-mono text-sm">STR #{s.strId} · {s.caseNumber}</p>
                <p className="text-sm text-muted-foreground">{s.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">v{s.version}</p>
                <p className="text-xs text-muted-foreground">
                  {s.updatedAt ? `waiting ${formatDistanceToNowStrict(s.updatedAt)}` : ''}
                </p>
              </div>
            </div>
          ))}
        </>
      );
    case 'workload':
      return (
        <>
          {list.items.map((w) => (
            <div key={w.name} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium">{w.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{w.assigned} assigned</Badge>
                <Badge variant="secondary">{w.inReview} in review</Badge>
                <span className="text-sm font-semibold w-8 text-right">{w.total}</span>
              </div>
            </div>
          ))}
        </>
      );
    default:
      return null;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboard, isLoading, isError } = useDashboard();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Computing compliance metrics...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            {SUBTITLE_BY_SCOPE[dashboard?.scope] ?? "Here's your AML compliance overview for today"}
          </p>
        </div>

        {isError || !dashboard ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              The dashboard couldn't be loaded. Refresh the page to try again.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboard.tiles.map((tile) => <Tile key={tile.key} tile={tile} />)}
            </div>

            {/* Lists */}
            <div className="grid gap-6 lg:grid-cols-2">
              {dashboard.lists.map((list) => (
                <Card key={list.key} className="card-interactive">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{list.title}</CardTitle>
                      <CardDescription>{list.description}</CardDescription>
                    </div>
                    {list.link && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(list.link)}>
                        View all
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ListRows list={list} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
