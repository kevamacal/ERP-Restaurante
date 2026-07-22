import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'emerald' | 'indigo' | 'violet' | 'amber' | 'cyan';
  badgeText?: string;
}

const colorMap = {
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'hover:border-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    accent: 'text-emerald-400'
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    glow: 'hover:border-indigo-500/30',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    accent: 'text-indigo-400'
  },
  violet: {
    iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    glow: 'hover:border-violet-500/30',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    accent: 'text-violet-400'
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'hover:border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    accent: 'text-amber-400'
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    glow: 'hover:border-cyan-500/30',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    accent: 'text-cyan-400'
  }
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  badgeText
}) => {
  const styles = colorMap[color];

  return (
    <div className={`glass-card p-5 rounded-2xl border ${styles.glow} relative overflow-hidden group`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${styles.iconBg} group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
          {value}
        </div>
        {badgeText && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
