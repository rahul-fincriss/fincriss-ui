import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Settings2, Route, Clock, Bell, Archive, Bot } from 'lucide-react';
import { AgentSettingsTab } from '@/components/settings/AgentSettingsTab';
import { canWriteSettings } from '@/lib/permissions';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { QueueRoutingSettingsTab } from '@/components/settings/QueueRoutingSettingsTab';
import { SLASettingsTab } from '@/components/settings/SLASettingsTab';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { AuditRetentionSettingsTab } from '@/components/settings/AuditRetentionSettingsTab';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // Access control: Only super_admin and compliance can access
  if (!user || !['super_admin', 'compliance'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isReadOnly = user.role === 'compliance';
  const showAgent = canWriteSettings(user);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
            <p className="text-muted-foreground">
              Configure platform-wide settings and defaults
            </p>
          </div>
          {isReadOnly && (
            <Badge variant="secondary" className="gap-1.5">
              <Info className="h-3 w-3" />
              Read-Only Access
            </Badge>
          )}
        </div>

        {/* Read-only notice for Compliance */}
        {isReadOnly && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You have read-only access to Settings. Contact a Super Admin to make changes.
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full h-auto p-1 ${showAgent ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="general" className="flex items-center gap-2 py-2.5">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="queues" className="flex items-center gap-2 py-2.5">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Queues & Routing</span>
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2 py-2.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">SLA & Escalations</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 py-2.5">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Audit & Retention</span>
            </TabsTrigger>
            {showAgent && (
              <TabsTrigger value="agent" className="flex items-center gap-2 py-2.5">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">AI Assistant</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <GeneralSettingsTab isReadOnly={isReadOnly} />
          </TabsContent>
          <TabsContent value="queues" className="mt-6">
            <QueueRoutingSettingsTab isReadOnly={isReadOnly} />
          </TabsContent>
          <TabsContent value="sla" className="mt-6">
            <SLASettingsTab isReadOnly={isReadOnly} />
          </TabsContent>
          {showAgent && (
            <TabsContent value="agent" className="mt-6">
              <AgentSettingsTab />
            </TabsContent>
          )}
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettingsTab isReadOnly={isReadOnly} />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditRetentionSettingsTab isReadOnly={isReadOnly} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
