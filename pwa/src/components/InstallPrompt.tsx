import React, { useState, useEffect } from 'react';
import { X, Download, Share, Smartphone } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if the app is already installed/running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed it in this session
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // 3. Detect iOS
    const isIOSDevice = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    
    setIsIOS(isIOSDevice);

    // 4. Handle Android/Chrome PWA install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS or other devices where browser won't fire beforeinstallprompt,
    // we can show the banner after a short delay (e.g. 5 seconds) to avoid spamming the user.
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User choice: ${outcome}`);

    // We no longer need the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="glass-panel p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 shadow-2xl flex items-start gap-3.5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="space-y-1.5 flex-1 pr-6">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-heading flex items-center gap-1.5">
            Instalar App en el Móvil
          </h4>
          
          {isIOS ? (
            <p className="text-[10px] text-slate-300 leading-normal">
              Pulsa el botón de <strong className="text-white">Compartir</strong>{' '}
              <Share className="h-3 w-3 inline mx-0.5 text-indigo-400" /> en Safari y luego selecciona{' '}
              <strong className="text-white">"Añadir a la pantalla de inicio"</strong> para acceder al TPV como una aplicación.
            </p>
          ) : (
            <p className="text-[10px] text-slate-300 leading-normal">
              Instala la aplicación en tu pantalla de inicio para acceder rápidamente a la facturación y el control horario en tiempo real.
            </p>
          )}

          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="mt-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-[10px] font-bold text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Instalar TPV Dashboard
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors absolute top-3 right-3"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
