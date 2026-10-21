import React from "react";
import { Info } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, action }) => {
  return (
    <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3">
        <Info className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
        {message}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
};
