import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  alerts: 'Alerts',
  workbench: 'Alert Workbench',
  customers: 'Customer 360',
  cases: 'Cases',
  audit: 'Audit Trail',
  mlops: 'ML Ops',
  workforce: 'Workforce Management',
  settings: 'General Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = routeLabels[value] || value;

        return (
          <div key={to} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                to={to}
                className={cn(
                  'text-muted-foreground hover:text-foreground transition-colors',
                  isLast && 'pointer-events-none'
                )}
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
