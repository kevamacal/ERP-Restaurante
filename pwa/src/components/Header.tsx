import React from 'react';
import { Store, Sun, Moon, LogOut } from 'lucide-react';

interface HeaderProps {
  selectedLocal: string;
  onSelectLocal: (id: string) => void;
  locales: { id: string; nombre: string }[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user?: any;
  empresa?: any;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedLocal,
  onSelectLocal,
  locales,
  theme,
  onToggleTheme,
  user,
  empresa,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Store className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none font-heading flex items-center gap-2">
                TPV Control
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {empresa?.nombre ? `Empresa: ${empresa.nombre}` : 'Monitoreo Multi-Local & Multitenant'}
              </p>
            </div>
          </div>

          {/* Quick Status Pill Mobile */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
              title="Cerrar Sesión y Salir"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700/30 cursor-pointer"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* Local Selector Pills & Controls */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto max-w-full">
            {locales.map((loc) => {
              const isSelected = selectedLocal === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onSelectLocal(loc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                    }`}
                >
                  {loc.nombre}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cerrar Sesión y Salir"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{user?.email ? user.email.split('@')[0] : 'Cerrar Sesión'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700/50 cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

