import React from "react";
import { AlertCircle, Trash2, LogOut } from "lucide-react";

export interface DeleteModalState {
  isOpen: boolean;
  type: "gasto" | "ingreso" | "fichaje" | "logout";
  id?: string;
  title: string;
  subtitle?: string;
  itemDetails?: string;
  confirmText?: string;
}

interface ConfirmDeleteModalProps {
  modalState: DeleteModalState | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  modalState,
  onClose,
  onConfirm,
}) => {
  if (!modalState || !modalState.isOpen) return null;

  const isLogout = modalState.type === "logout";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
        <div className="flex items-start gap-3">
          <div
            className={`p-3 rounded-xl shrink-0 mt-0.5 ${
              isLogout
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400"
            }`}
          >
            {isLogout ? <LogOut className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              {modalState.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {modalState.subtitle || "¿Confirmas que deseas eliminar este registro permanentemente?"}
            </p>
          </div>
        </div>

        {modalState.itemDetails && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">
            {modalState.itemDetails}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 !text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
          >
            {isLogout ? (
              <>
                <LogOut className="h-3.5 w-3.5" /> {modalState.confirmText || "Cerrar Sesión"}
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" /> {modalState.confirmText || "Confirmar Eliminación"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

