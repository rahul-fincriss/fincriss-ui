import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2, ShieldAlert, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { useCustomer360 } from '@/hooks/useCustomer360';
import { formatINRFull } from '@/lib/formatters';
import { Case } from '@/types';
import { format } from 'date-fns';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium text-sm">{children ?? '—'}</div>
    </div>
  );
}

const fmtDate = (d?: string) => (d ? format(new Date(d), 'MMM dd, yyyy') : '—');
const num = (v: unknown) => (typeof v === 'number' ? v : v != null ? Number(v) : undefined);

export function CaseCustomerRiskCard({ caseData }: { caseData: Case }) {
  const { data: profile, isLoading, error } = useCustomer360(caseData.customerId || null);
  const features = caseData.customerFeatures || {};
  const latestAssessment = profile?.risk_assessments?.[0];
  const screeningHits = profile?.screening_results || [];
  const activeWatchlist = (profile?.watchlist_entries || []).filter(
    (w) => (w.status || '').toLowerCase() === 'active'
  );

  const isPep = profile?.is_pep ?? caseData.customerIsPep;
  const riskRating = profile?.risk_rating || caseData.customerRiskRating;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            Customer Risk Profile
          </CardTitle>
          <CardDescription>
            {caseData.customerName} · <span className="font-mono">{caseData.customerId}</span> · current profile (not frozen)
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/customers?id=${encodeURIComponent(caseData.customerId)}`}>
            Customer 360 <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <RiskBadge level={riskRating?.toLowerCase()} />
          {profile?.risk_score != null && <Badge variant="outline">Risk score {profile.risk_score}</Badge>}
          {isPep && <Badge className="badge-risk-high">PEP</Badge>}
          {profile?.is_sanctioned && <Badge className="badge-risk-high">Sanctioned</Badge>}
          {profile?.is_watchlisted && <Badge className="badge-risk-medium">Watchlisted</Badge>}
          {profile?.adverse_media_flag && <Badge className="badge-risk-medium">Adverse media</Badge>}
          {profile?.high_risk_jurisdiction_flag && <Badge className="badge-risk-medium">High-risk jurisdiction</Badge>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Customer type">{caseData.customerType || profile?.party_type}</Field>
          <Field label="Nationality">{caseData.customerNationality || profile?.nationality}</Field>
          <Field label="Occupation">{caseData.customerOccupation || profile?.occupation}</Field>
          <Field label="Industry">{profile?.industry || caseData.customerIndustryCode}</Field>
          <Field label="Customer since">{fmtDate(caseData.customerSince || profile?.customer_since)}</Field>
          <Field label="KYC status">
            {profile?.kyc_status ? <span className="capitalize">{profile.kyc_status}</span> : '—'}
            {profile?.kyc_level && <span className="text-muted-foreground"> · {profile.kyc_level}</span>}
          </Field>
          <Field label="Last KYC refresh">{fmtDate(profile?.last_kyc_refresh)}</Field>
          <Field label="Next KYC due">{fmtDate(profile?.next_kyc_due || profile?.next_kyc_review_due)}</Field>
          <Field label="Prior activity">
            {profile ? `${profile.open_alerts_count ?? 0} open alerts · ${profile.active_cases_count ?? 0} active cases` : '—'}
          </Field>
        </div>

        {/* Declared vs observed — the core AML comparison */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium mb-3">Declared vs observed activity</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Declared annual income">
              {profile?.annual_income != null ? formatINRFull(profile.annual_income) : '—'}
            </Field>
            <Field label="Expected turnover">
              {profile?.expected_turnover != null ? formatINRFull(profile.expected_turnover) : '—'}
            </Field>
            <Field label="Avg txn (30d)">
              {num(features.avg_amount_30d) != null ? formatINRFull(num(features.avg_amount_30d)!) : '—'}
            </Field>
            <Field label="Max txn (30d)">
              {num(features.max_amount_30d) != null ? formatINRFull(num(features.max_amount_30d)!) : '—'}
            </Field>
            <Field label="Txns (7d / 30d / 90d)">
              {features.txn_count_30d != null
                ? `${features.txn_count_7d ?? 0} / ${features.txn_count_30d} / ${features.txn_count_90d ?? 0}`
                : '—'}
            </Field>
            <Field label="Countries (30d)">{features.countries_count_30d ?? '—'}</Field>
            <Field label="High-risk country txns (30d)">{features.high_risk_country_txns_30d ?? '—'}</Field>
            <Field label="Cash-intensive ratio">
              {num(features.cash_intensive_ratio) != null
                ? `${(num(features.cash_intensive_ratio)! * 100).toFixed(0)}%`
                : '—'}
            </Field>
          </div>
          {profile?.expected_account_activity && (
            <p className="text-xs text-muted-foreground mt-3">
              Expected activity: {profile.expected_account_activity}
            </p>
          )}
        </div>

        {latestAssessment && (
          <div className="rounded-lg border border-border p-4 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">Latest risk assessment</p>
              <RiskBadge level={latestAssessment.rating?.toLowerCase()} size="sm" />
              <span className="text-xs text-muted-foreground">{fmtDate(latestAssessment.date)}</span>
            </div>
            {latestAssessment.rationale && (
              <p className="text-sm text-muted-foreground">{latestAssessment.rationale}</p>
            )}
          </div>
        )}

        {(screeningHits.length > 0 || activeWatchlist.length > 0) && (
          <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-risk-high" />
              Screening & watchlist
            </p>
            {screeningHits.slice(0, 3).map((s, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{s.type}</span>
                {s.matched_entity_name && ` — ${s.matched_entity_name}`}
                {s.list_name && ` (${s.list_name})`}
                {s.match_score != null && ` · match ${s.match_score}`}
                {` · ${s.status}`}
              </p>
            ))}
            {screeningHits.length > 3 && (
              <p className="text-xs text-muted-foreground">+{screeningHits.length - 3} more in Customer 360</p>
            )}
            {activeWatchlist.map((w, i) => (
              <p key={`w${i}`} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Watchlist: {w.watchlist_type}</span> — {w.reason}
              </p>
            ))}
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading KYC and screening details…
          </p>
        )}
        {error && (
          <p className="text-xs text-muted-foreground">
            KYC and screening details are unavailable right now; showing the case snapshot only.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
