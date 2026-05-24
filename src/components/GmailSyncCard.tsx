import React from 'react';
import { 
  Mail, RefreshCw, Power, Loader2, CheckCircle2, 
  ToggleLeft, ToggleRight, Sparkles, AlertCircle, Clock 
} from 'lucide-react';
import { motion } from 'motion/react';

interface GmailSyncCardProps {
  gmailToken: string | null;
  gmailUserEmail: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

export default function GmailSyncCard({
  gmailToken,
  gmailUserEmail,
  onConnect,
  onDisconnect,
  onManualSync,
  isSyncing,
  lastSyncTime,
  autoSync,
  onToggleAutoSync
}: GmailSyncCardProps) {
  return (
    <div 
      className="rounded-2xl border-2 border-biomig-lime bg-white p-5 shadow-sm relative overflow-hidden" 
      id="gmail-sync-card"
    >
      {/* Decorative accent background badge */}
      <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-biomig-light/20 to-transparent rounded-bl-full pointer-events-none" />

      {/* Header section with brand icon */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
            <Mail className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-biomig-navy tracking-wider">
              Sincronização Gmail
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              Conexão entre Dispositivos
            </p>
          </div>
        </div>

        {gmailToken && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping"></span>
            Ativo
          </span>
        )}
      </div>

      {/* Core card body */}
      {!gmailToken ? (
        <div className="space-y-3.5 py-1">
          <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
            Conecte sua conta do Google para enviar atualizações aos administradores e sincronizar dados entre motoristas e painel em tempo real.
          </p>

          <button
            type="button"
            onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-xs py-2.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            id="gsi-gmail-connect-btn"
          >
            <Mail className="h-4 w-4" />
            Conectar conta Gmail
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Identity info */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-extrabold select-none">
                G
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none tracking-wider">Conta Vinculada</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5" title={gmailUserEmail || ''}>
                  {gmailUserEmail || 'gmail@conectado.com'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDisconnect}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all cursor-pointer"
              title="Desconectar Gmail"
              id="gmail-disconnect-btn"
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sync operations controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onManualSync}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs py-2 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-biomig-navy" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-biomig-lime" />
              )}
              Sincronizar Já
            </button>

            <button
              type="button"
              onClick={onToggleAutoSync}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Auto-Sync</span>
              </div>
              {autoSync ? (
                <ToggleRight className="h-5 w-5 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Footer state indicator */}
          <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1 font-semibold">
              <Clock className="h-3 w-3" />
              <span>Última Sincronização:</span>
            </div>
            <span className="font-mono font-bold text-slate-600">
              {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Não sincronizado'}
            </span>
          </div>

          {/* Auto syncing pill animation */}
          {autoSync && (
            <div className="rounded-lg bg-emerald-50/50 p-2 border border-emerald-100 flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <p className="text-[10px] text-emerald-800 font-semibold leading-tight leading-relaxed">
                Atualização automática ativa. Polling de e-mails em tempo real a cada 15 segundos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
