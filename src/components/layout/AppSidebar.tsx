import { Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Database,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  Settings,
  Shield,
  UserSearch,
  UsersRound,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { ThemedLogo } from '@/components/shared/ThemedLogo';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        roles: ['analyst', 'investigator', 'principal_officer', 'compliance', 'super_admin'],
      },
    ],
  },
  {
    label: 'Alerts & Cases',
    items: [
      {
        title: 'Alert Workbench',
        url: '/alerts/workbench',
        icon: Zap,
        roles: ['analyst', 'investigator', 'super_admin'],
        badge: '12',
      },
      {
        title: 'Triage Queue',
        url: '/triage',
        icon: Inbox,
        roles: ['triage_manager', 'investigator', 'super_admin'],
      },
      {
        title: 'Customer 360',
        url: '/customers',
        icon: UserSearch,
        roles: ['analyst', 'investigator', 'principal_officer', 'compliance', 'super_admin'],
      },
      {
        title: 'Cases',
        url: '/cases',
        icon: FolderOpen,
        roles: ['investigator', 'principal_officer', 'compliance', 'super_admin'],
        badge: '8',
      },
      {
        title: 'STR Reports',
        url: '/str',
        icon: FileText,
        roles: ['investigator', 'principal_officer', 'compliance', 'super_admin'],
      },
    ],
  },
  {
    label: 'Audit & Compliance',
    items: [
      {
        title: 'Audit Trail',
        url: '/audit',
        icon: History,
        roles: ['compliance', 'super_admin'],
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      {
        title: 'Reference Data',
        url: '/reference-data',
        icon: Database,
        roles: ['super_admin', 'compliance'],
      },
      {
        title: 'Rules Engine',
        url: '/rules-engine',
        icon: Shield,
        roles: ['super_admin'],
      },
      {
        title: 'Model Governance',
        url: '/ml-status',
        icon: ShieldCheck,
        roles: ['super_admin', 'principal_officer', 'compliance'],
      },
      {
        title: 'Workforce Management',
        url: '/workforce',
        icon: UsersRound,
        roles: ['super_admin', 'compliance'],
      },
      {
        title: 'General Settings',
        url: '/settings',
        icon: Settings,
        roles: ['super_admin', 'compliance'],
      },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Sections with nothing visible for this role are dropped entirely.
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => user && item.roles.includes(user.role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 px-2 py-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-background">
            <ThemedLogo className="h-10 w-10 object-cover" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                FinCrisS
              </span>
              <span className="text-xs text-muted-foreground">
                Financial Crime Intelligence
              </span>
            </div>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent>
        {visibleSections.map((section, index) => (
          <Fragment key={section.label ?? 'top'}>
            {index > 0 && <SidebarSeparator />}
            <SidebarGroup>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <a
                            href={item.url}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(item.url);
                            }}
                            className={cn(
                              'flex items-center gap-3',
                              isActive && 'bg-sidebar-accent'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.title}</span>
                            {item.badge && !isCollapsed && (
                              <Badge
                                variant="secondary"
                                className="ml-auto h-5 min-w-5 justify-center bg-primary/20 text-primary"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </Fragment>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
