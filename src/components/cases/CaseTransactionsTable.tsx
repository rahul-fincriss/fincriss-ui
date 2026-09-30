import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatINRFull } from '@/lib/formatters';
import { CaseTransaction } from '@/types';
import { format } from 'date-fns';

export function CaseTransactionsTable({ transactions }: { transactions: CaseTransaction[] }) {
  const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transactions ({transactions.length})</CardTitle>
        <CardDescription>
          Transactions linked to this case's alerts, frozen at escalation
          {transactions.length > 0 && ` · total ${formatINRFull(total)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No transactions linked to this case</p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Source alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.transId}>
                    <TableCell className="whitespace-nowrap">{format(t.date, 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <p className="font-mono text-sm">{t.transId}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </TableCell>
                    <TableCell>{t.transType?.replace(/_/g, ' ') || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatINRFull(t.amount)}</TableCell>
                    <TableCell>{t.channel ? <Badge variant="outline">{t.channel}</Badge> : '—'}</TableCell>
                    <TableCell>{t.country ? <Badge variant="outline">{t.country}</Badge> : '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{t.counterpartyId || '—'}</TableCell>
                    <TableCell>
                      {t.sourceAlertId ? (
                        <Link to={`/alerts/${t.sourceAlertId}`} className="font-mono text-xs text-primary hover:underline">
                          {t.sourceAlertId}
                        </Link>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
