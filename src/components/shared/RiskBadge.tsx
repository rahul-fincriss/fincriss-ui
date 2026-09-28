import { cn } from '@/lib/utils';
import { RiskLevel } from '@/types';

interface RiskBadgeProps {
  // Accept unknown strings/undefined too — data isn't always a clean RiskLevel.
  level?: RiskLevel | string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskBadge({ level, size = 'md', showLabel = true }: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'h-5 px-1.5 text-xs',
    md: 'h-6 px-2 text-sm',
    lg: 'h-7 px-3 text-sm',
  };

  const levelConfig: Record<string, { className: string; label: string }> = {
    high: {
      className: 'badge-risk-high',
      label: 'High',
    },
    medium: {
      className: 'badge-risk-medium',
      label: 'Medium',
    },
    low: {
      className: 'badge-risk-low',
      label: 'Low',
    },
  };

  const key = typeof level === 'string' ? level.toLowerCase() : '';
  // Fallback for unknown / missing risk levels so a bad value never crashes the page.
  const config = levelConfig[key] ?? {
    className: 'bg-muted text-muted-foreground',
    label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold',
        sizeClasses[size],
        config.className
      )}
    >
      {showLabel ? config.label : (config.label[0] || '?').toUpperCase()}
    </span>
  );
}
