import React from 'react';
import { Store, RefreshCw, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  selectedLocal: string;
  onSelectLocal: (id: string) => void;
  locales: { id: string; nombre: string }[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  selectedLocal,
  onSelectLocal,
  locales,
  theme,
  onToggleTheme
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
              <h1 className="text-lg font-bold text-white tracking-tight leading-none font-heading flex items-center gap-2">
                TPV Control <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v1.0</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Monitoreo de Facturación Multi-Local</p>
            </div>
          </div>

          {/* Quick Status Pill Mobile */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* Local Selector Pills & Controls */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {locales.map((loc) => (
              <button
                key={loc.id}
                onClick={() => onSelectLocal(loc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  selectedLocal === loc.id
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {loc.nombre}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </button>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
              title="Actualizar datos"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
