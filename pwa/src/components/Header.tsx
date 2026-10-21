import React from 'react';
import { Sun, Moon, LogOut, Settings } from 'lucide-react';

// Custom restaurant SVG logo — fork & knife silhouette
const RestaurantLogo: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Fork */}
    <path
      d="M7 2v4c0 1.1.9 2 2 2v13a1 1 0 0 0 2 0V8c1.1 0 2-.9 2-2V2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="9" y1="2" x2="9" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="11" y1="2" x2="11" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {/* Knife */}
    <path
      d="M16 2c0 0 2 2.5 2 6s-2 5-2 5v8a1 1 0 0 1-2 0V2h2z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.15"
    />
  </svg>
);

interface HeaderProps {
  selectedLocal: string;
  onSelectLocal: (id: string) => void;
  locales: { id: string; nombre: string }[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  user,
  empresa,
  onSignOut,
}) => {
  // Determine the display name for the current local
  const currentLocal = locales.find((l) => l.id === selectedLocal && l.id !== 'all');
  const headerTitle = currentLocal?.nombre ?? empresa?.nombre ?? 'Panel de Control';

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-amber-900/20 dark:border-amber-700/10 px-4 py-3 sm:px-6 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              {/* Warm gradient ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 opacity-90" />
              <div className="absolute inset-[2px] rounded-[10px] bg-stone-950 dark:bg-stone-950 flex items-center justify-center">
                <RestaurantLogo className="h-5 w-5 text-amber-400" />
              </div>
            </div>

            <div>
              <h1 className="text-base font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-none font-heading">
                {headerTitle}
              </h1>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium mt-0.5 leading-none">
                {empresa?.nombre && currentLocal
                  ? empresa.nombre
                  : 'Gestión de restaurante'}
              </p>
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex sm:hidden items-center gap-1.5">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Ajustes de costes"
                className="p-2 rounded-lg bg-stone-100/80 hover:bg-stone-200 dark:bg-stone-800/60 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors border border-stone-200 dark:border-stone-700/30 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
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
              className="p-2 rounded-lg bg-stone-100/80 hover:bg-stone-200 dark:bg-stone-800/60 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors border border-stone-200 dark:border-stone-700/30 cursor-pointer"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-amber-600" />}
            </button>
          </div>
        </div>

        {/* Local selector + desktop controls */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          {/* Local Pills */}
          <div className="flex items-center bg-stone-100/80 dark:bg-stone-900/90 p-1 rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto max-w-full gap-0.5">
            {locales.map((loc) => {
              const isSelected = selectedLocal === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onSelectLocal(loc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800/60'
                  }`}
                >
                  {loc.nombre}
                </button>
              );
            })}
          </div>

          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Ajustes de costes"
                title="Ajustes de costes"
                className="p-2 rounded-xl bg-stone-100/80 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors border border-stone-200 dark:border-stone-700/50 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}

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
              className="p-2 rounded-xl bg-stone-100/80 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors border border-stone-200 dark:border-stone-700/50 cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-amber-600" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
