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
    <div className={`glass-card p-3.5 sm:p-5 rounded-2xl border ${styles.glow} relative overflow-hidden group`}>
      <div className="flex items-start justify-between mb-2.5 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 truncate pr-2">
          {title}
        </span>
        <div className={`p-1.5 sm:p-2.5 rounded-xl border shrink-0 ${styles.iconBg} group-hover:scale-110 transition-transform`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-1 flex-wrap">
        <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white font-heading tracking-tight truncate">
          {value}
        </div>
        {badgeText && (
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold border ${styles.badge}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2 font-medium leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  );
};
