import React from "react";
import type { LucideIcon } from "lucide-react";

type StatTone = "emerald" | "indigo" | "violet" | "amber" | "cyan" | "slate";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: StatTone;
  badge?: string;
}

const toneMap: Record<StatTone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20",
  indigo: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20",
  violet: "bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "slate",
  badge,
}) => {
  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[104px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <span className={`p-1.5 rounded-lg border shrink-0 ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2">
        <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-heading font-mono tracking-tight">
          {value}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {subtitle ? (
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              {subtitle}
            </span>
          ) : (
            <span />
          )}
          {badge ? (
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
