import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Cargando aplicación...',
}) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-950"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-orange-600/8 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 z-10">
        {/* Logo mark */}
        <div className="relative">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 opacity-30 animate-ping" />
          {/* Inner logo container */}
          <div className="relative h-20 w-20 rounded-2xl flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 opacity-90" />
            <div className="absolute inset-[3px] rounded-[14px] bg-stone-950 flex items-center justify-center">
              <RestaurantIcon className="h-9 w-9 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-heading tracking-tight text-white mb-1">
            Baryk
          </h1>
          <p className="text-xs text-amber-500 font-semibold tracking-[0.2em] uppercase">
            Sistema de Gestión
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4">
          {/* Animated dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-amber-500"
                style={{
                  animation: `loading-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-48 h-[2px] bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              style={{ animation: 'loading-bar 1.8s ease-in-out infinite' }}
            />
          </div>

          <p className="text-xs text-stone-500 font-medium">{message}</p>
        </div>
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes loading-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        @keyframes loading-bar {
          0%   { width: 0%;    margin-left: 0;    }
          50%  { width: 70%;   margin-left: 15%;  }
          100% { width: 0%;    margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

// Inline SVG logo (same as ClockInView to avoid circular imports)
const RestaurantIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M7 2v4c0 1.1.9 2 2 2v13a1 1 0 0 0 2 0V8c1.1 0 2-.9 2-2V2"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    />
    <line x1="9" y1="2" x2="9" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="11" y1="2" x2="11" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M16 2c0 0 2 2.5 2 6s-2 5-2 5v8a1 1 0 0 1-2 0V2h2z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      fill="currentColor" fillOpacity="0.15"
    />
  </svg>
);

export default LoadingScreen;
