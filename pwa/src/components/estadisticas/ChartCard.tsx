import React from "react";
import type { LucideIcon } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className = "",
}) => {
  return (
    <section
      className={`glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          {Icon ? (
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
};
