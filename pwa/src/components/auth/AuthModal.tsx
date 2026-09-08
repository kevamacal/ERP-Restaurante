import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { X, Lock, Mail, Building2, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, Zap } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    loading,
    authError,
    setAuthError,
  } = useAuth();

  if (!isOpen) return null;

  const handleDemoLogin = async () => {
    setSuccessMsg(null);
    setAuthError(null);
    setEmail("demo@erprestaurante.app");
    setPassword("DemoPassword123!");
    const ok = await signInWithEmail("demo@erprestaurante.app", "DemoPassword123!");
    if (ok) {
      setSuccessMsg("¡Accediendo al entorno demo!");
      sessionStorage.setItem("admin_authenticated", "true");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setAuthError(null);

    if (mode === "login") {
      const ok = await signInWithEmail(email, password);
      if (ok) {
        setSuccessMsg("¡Sesión iniciada con éxito!");
        sessionStorage.setItem("admin_authenticated", "true");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }
    } else {
      if (!companyName.trim()) {
        setAuthError("Por favor, introduce el nombre de tu empresa/restaurante.");
        return;
      }
      const ok = await signUpWithEmail(email, password, companyName.trim());
      if (ok) {
        setSuccessMsg("¡Registro completado! Revisa tu email para confirmar o inicia sesión.");
        sessionStorage.setItem("admin_authenticated", "true");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 relative shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-xl hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-500/10">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold font-heading text-white">
            {mode === "login"
              ? "Acceso Propietario / Admin"
              : "Registra tu Empresa SaaS"}
          </h3>
          <p className="text-xs text-slate-400">
            {mode === "login"
              ? "Accede a la gestión multi-tenant de tus restaurantes"
              : "Crea tu cuenta de restaurante para gestionar locales y empleados"}
          </p>
        </div>

        {/* Demo Sandbox Quick Access */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 text-left space-y-2 shadow-xl shadow-indigo-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>Entorno Demo / Sandbox</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
              Acceso 1-Click
            </span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-400 hover:to-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer transform active:scale-[0.98]"
          >
            <Zap className="h-4 w-4 fill-white" />
            <span>Entrar como Demo</span>
          </button>
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>demo@erprestaurante.app</span>
            <span className="text-indigo-400">PIN Admin: 1234</span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setAuthError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              mode === "login"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setAuthError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
              mode === "register"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Crear Empresa
          </button>
        </div>

        {/* Error / Success Feedback */}
        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div className="space-y-1">
              <label
                htmlFor="companyNameInput"
                className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block"
              >
                Nombre del Restaurante / Empresa *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="companyNameInput"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej. Grupo La Peña S.L."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="emailInput"
              className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block"
            >
              Email Propietario *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                id="emailInput"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dueno@restaurante.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="passInput"
              className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block"
            >
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                id="passInput"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            <ShieldCheck className="h-4 w-4" />
            {mode === "login"
              ? "Entrar al Dashboard Admin"
              : "Registrar Empresa y Comenzar"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-950 px-3 text-[10px] text-slate-500 uppercase font-semibold">
            o
          </span>
        </div>

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
            />
          </svg>
          Continuar con Google
        </button>
      </div>
    </div>
  );
};
