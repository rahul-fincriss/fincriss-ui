import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Filter, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminAuditEntry, AdminAuditActionType } from '@/types/admin';
import { useAdminAuditLogs } from '@/hooks/useAudit';
import { Loader2, AlertCircle } from 'lucide-react';

const actionTypeLabels: Record<AdminAuditActionType, string> = {
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deleted: 'User Deleted',
  user_activated: 'User Activated',
  user_deactivated: 'User Deactivated',
  role_created: 'Role Created',
  role_updated: 'Role Updated',
  role_renamed: 'Role Renamed',
  permission_changed: 'Permission Changed',
  queue_created: 'Queue Created',
  queue_updated: 'Queue Updated',
  queue_deactivated: 'Queue Deactivated',
  queue_membership_changed: 'Queue Membership Changed',
  settings_changed: 'Settings Changed',
};

const actionTypeColors: Record<AdminAuditActionType, string> = {
  user_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  user_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  user_activated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  user_deactivated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  role_created: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  role_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  role_renamed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  permission_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  queue_created: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  queue_updated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  queue_deactivated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  queue_membership_changed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  settings_changed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export function AdminAuditLog() {
  const { data: auditLog, isLoading, error } = useAdminAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLog = useMemo(() => {
    return (auditLog || [])
      .filter((entry) => {
        const matchesSearch =
          searchQuery === '' ||
          entry.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.details?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesEntity =
          entityFilter === 'all' || entry.entityType === entityFilter;

        const matchesAction =
          actionFilter === 'all' || entry.actionType === actionFilter;

        return matchesSearch && matchesEntity && matchesAction;
      })
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }, [auditLog, searchQuery, entityFilter, actionFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Workforce Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, user, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="role">Roles</SelectItem>
                <SelectItem value="permission">Permissions</SelectItem>
                <SelectItem value="queue">Queues</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(actionTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground animate-pulse">Loading audit history...</p>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center py-8 text-destructive">
                    <AlertCircle className="h-8 w-8 mx-auto" />
                    <p className="mt-2 font-medium">Failed to load audit logs</p>
                  </TableCell>
                </TableRow>
              ) : filteredLog.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit entries found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>{format(entry.performedAt, 'MMM d, yyyy')}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(entry.performedAt, 'HH:mm:ss')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={actionTypeColors[entry.actionType] || 'bg-muted text-muted-foreground'}
                      >
                        {actionTypeLabels[entry.actionType] ||
                          entry.actionType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{entry.entityName}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {entry.entityType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{entry.performedBy}</TableCell>
                    <TableCell className="text-sm">
                      {entry.previousValue && entry.newValue ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {entry.previousValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                            {entry.newValue}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.details || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredLog.length} of {auditLog?.length || 0} entries
        </div>
      </CardContent>
    </Card>
  );
}
