import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRules } from '@/hooks/useRules';
import { useModelMonitoring, useModelStatus, useModelVersions } from '@/hooks/useModelGovernance';
import { ModelCardTab } from '@/components/model/ModelCardTab';
import { ValidationTab } from '@/components/model/ValidationTab';
import { VersionHistoryTab } from '@/components/model/VersionHistoryTab';
import { SyntheticDataNotice } from './ModelGovernancePage';

/**
 * Single-page model governance report for a bank's model-risk file:
 * model card, validation of the active version, and version history.
 * Print or save as PDF from the browser.
 */
export default function ModelGovernancePrintPage() {
  const { data: status } = useModelStatus();
  const { data: versions = [] } = useModelVersions();
  const { data: monitoring } = useModelMonitoring();
  const { data: rules } = useRules();
  const active = status?.activeVersion;
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="mx-auto max-w-5xl space-y-8 bg-background p-8 print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Model Governance Report</h1>
          <p className="text-sm text-muted-foreground">
            FinCrisS alert-prioritisation model · active version {active?.version ?? '—'} · generated {generated}
          </p>
        </div>
        <Button onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print or save as PDF
        </Button>
      </div>

      <SyntheticDataNotice share={monitoring?.syntheticShare} />

      {!status ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="border-b pb-2 text-lg font-semibold">1. Model card</h2>
            <ModelCardTab status={status} rules={rules} />
          </section>
          <section className="space-y-4 break-before-page">
            <h2 className="border-b pb-2 text-lg font-semibold">2. Validation of the active version</h2>
            {active && (
              <ValidationTab versions={versions} selected={active.version} onSelect={() => {}} showSelector={false} />
            )}
          </section>
          <section className="space-y-4 break-before-page">
            <h2 className="border-b pb-2 text-lg font-semibold">3. Version history</h2>
            <VersionHistoryTab versions={versions} />
          </section>
        </>
      )}
    </div>
  );
}
