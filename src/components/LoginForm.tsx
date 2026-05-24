import React, { useState } from 'react';
import { 
  Truck, Shield, User, Lock, ArrowRight, Activity, LogIn, Database, ChevronRight, UserPlus, Sparkles 
} from 'lucide-react';
import { motion } from 'motion/react';
import { authService, dbService, activeDBProvider } from '../firebase';

interface LoginFormProps {
  onLogin: (email: string, role: 'ADMIN' | 'DRIVER', name: string) => void;
  drivers: { name: string; email: string }[];
}

export default function LoginForm({ onLogin, drivers }: LoginFormProps) {
  const [authTab, setAuthTab] = useState<'real' | 'demo'>('real');
  const [isRegistering, setIsRegistering] = useState(false);

  // States for Local Demo
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States for Real Firebase Auto
  const [realEmail, setRealEmail] = useState('');
  const [realPassword, setRealPassword] = useState('');

  // States for Real Firebase Signup
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'ADMIN' | 'DRIVER'>('DRIVER');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Google Sign-In Popup logic
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError('Erro ao fazer login com o Google: ' + (err.message || 'tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Real Email & Password Login logic
  const handleRealEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanEmail = realEmail.trim().toLowerCase();
      if (!cleanEmail || !realPassword) {
        setError('Por favor, preencha o e-mail e a senha.');
        return;
      }
      await authService.signInWithEmail(cleanEmail, realPassword);
    } catch (err: any) {
      console.error('Email Login Error:', err);
      setError('Erro ao autenticar: e-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Real Email & Password Register logic
  const handleRealEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      const cleanName = regName.trim();

      if (!cleanName || !cleanEmail || !regPassword) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      if (regPassword.length < 6) {
        setError('A senha precisa conter pelo menos 6 caracteres.');
        return;
      }

      // Create new Auth User
      const user = await authService.signUpWithEmail(cleanEmail, regPassword, cleanName);
      const uid = user.uid;

      // Save user profile settings under user record
      const resolvedRole = cleanEmail === 'admin@bioentregas.com' ? 'ADMIN' : regRole;
      const profileData = {
        uid: uid,
        name: cleanName,
        email: cleanEmail,
        role: resolvedRole
      };

      await dbService.saveUserProfile(uid, profileData);
    } catch (err: any) {
      console.error('Register Error:', err);
      setError('Erro ao criar conta: ' + (err.message || 'verifique e tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // 4. Local Demo login submit handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const matchingDriver = drivers.find(d => d.email === email.trim().toLowerCase());

    if (email === 'admin@bioentregas.com' && password === 'admin123') {
      onLogin(email, 'ADMIN', 'Coordenação Geral');
    } else if (matchingDriver && password === 'motorista123') {
      onLogin(matchingDriver.email, 'DRIVER', matchingDriver.name);
    } else {
      setError('Credenciais inválidas de simulação. Use os botões rápidos.');
    }
  };

  const handleQuickLogin = (emailStr: string, role: 'ADMIN' | 'DRIVER', name: string) => {
    onLogin(emailStr, role, name);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8 md:py-12">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        id="login-card"
      >
        {/* Brand Banner with Biomig styling */}
        <div className="relative bg-gradient-to-tr from-biomig-navy via-slate-900 to-biomig-navy px-6 py-7 text-center text-white border-b-4 border-biomig-lime">
          <div className="mx-auto mb-2 flex flex-col items-center justify-center">
            <svg className="h-6 w-24 text-biomig-lime mb-1" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M10 18 Q 50 2 90 15" />
              <path d="M25 18 Q 55 8 85 18" strokeWidth="1.5" opacity="0.6" />
            </svg>
            <div className="flex items-baseline">
              <span className="font-sans text-3.5xl font-black tracking-tight text-white lowercase">biomig</span>
            </div>
            <span className="text-[10px] font-extrabold tracking-widest text-[#98c30c] uppercase ml-14 -mt-1.5 font-sans">
              Brasil
            </span>
          </div>
          
          <p className="mt-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider">
            LOGÍSTICA & ENTREGAS INTERNAS
          </p>
        </div>

        {/* Dynamic Dual Tab Selector: Nuvem Real vs. Simulador Offline */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => { setAuthTab('real'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authTab === 'real'
                ? 'bg-white text-biomig-navy shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className={`h-4 w-4 ${authTab === 'real' ? 'text-biomig-lime' : 'text-slate-400'}`} />
            Nuvem Real ({activeDBProvider === 'supabase' ? 'Supabase' : 'Firebase'})
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('demo'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authTab === 'demo'
                ? 'bg-white text-biomig-navy shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className={`h-4 w-4 ${authTab === 'demo' ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
            Demonstração (Local)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {authTab === 'real' ? (
            /* ========================================================= */
            /* 1. REAL REALTIME CLOUD CONNECTION WITH GOOGLE AND EMAIL   */
            /* ========================================================= */
            <div className="space-y-5">
              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3 flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-biomig-lime shrink-0" />
                <p className="text-[11px] text-emerald-800 font-semibold leading-normal">
                  Seus dados salvos nesta área serão sincronizados em tempo real no banco do {activeDBProvider === 'supabase' ? 'Supabase' : 'Firebase'}.
                </p>
              </div>

              {/* Google Sign In option */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] cursor-pointer"
                id="btn-google-login"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {loading ? 'Processando...' : 'Conectar com Conta Google'}
              </button>

              <div className="flex items-center justify-between text-slate-300">
                <span className="h-px w-[42%] bg-slate-200"></span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">ou</span>
                <span className="h-px w-[42%] bg-slate-200"></span>
              </div>

              {!isRegistering ? (
                /* --- A. Sign-In Form (Real Cloud email) --- */
                <form onSubmit={handleRealEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      E-mail Real {activeDBProvider === 'supabase' ? 'Supabase' : 'Firebase'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={realEmail}
                        onChange={(e) => { setRealEmail(e.target.value); setError(''); }}
                        placeholder="Ex: d.santos@gmail.com"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type="password"
                        required
                        value={realPassword}
                        onChange={(e) => { setRealPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-biomig-navy py-3 text-sm font-bold text-white transition-all hover:bg-biomig-hover active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-biomig-navy/25 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Acessando...' : `Acessar Conta ${activeDBProvider === 'supabase' ? 'Supabase' : 'Firebase'}`}
                    <ChevronRight className="h-4 w-4 text-biomig-lime" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(true); setError(''); }}
                      className="text-xs font-bold text-biomig-navy hover:text-biomig-hover hover:underline cursor-pointer flex items-center gap-1 mx-auto"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Ainda não possui conta? Registre-se na Nuvem
                    </button>
                  </div>
                </form>
              ) : (
                /* --- B. Sign-Up Form (Real Cloud email) --- */
                <form onSubmit={handleRealEmailRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Seu Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => { setRegName(e.target.value); setError(''); }}
                      placeholder="Ex: Douglas Santos"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Seu E-mail Real (Qualquer E-mail)
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => { setRegEmail(e.target.value); setError(''); }}
                      placeholder="Ex: doug@exemplo.com"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Definir Senha de Acesso (Mín. 6 carecteres)
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => { setRegPassword(e.target.value); setError(''); }}
                      placeholder="Escolha uma senha"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Perfil no Sistema
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'ADMIN' | 'DRIVER')}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="DRIVER">Motorista Operacional</option>
                      <option value="ADMIN">Administrador (Coordenação)</option>
                    </select>
                    {regRole === 'ADMIN' && (
                      <p className="text-[10px] text-rose-600 font-bold leading-normal mt-1 border-l-2 border-rose-500 pl-2">
                        *Nota: Restrito a `admin@bioentregas.com` pelas regras do Firebase. Outros e-mails serão registrados como Motoristas.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-biomig-navy py-3 text-sm font-bold text-white transition-all hover:bg-biomig-hover active:scale-[0.98] shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando...' : 'Criar Conta e Entrar'}
                    <ChevronRight className="h-4 w-4 text-biomig-lime" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setError(''); }}
                      className="text-xs font-bold text-biomig-navy hover:text-biomig-hover hover:underline cursor-pointer"
                    >
                      Já possui conta cadastrada? Fazer Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* 2. DEMO MODE OFFLINE/SIMULATED BYPASS WITH SHORTCUTS      */
            /* ========================================================= */
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 flex gap-2">
                <Shield className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-normal font-semibold">
                  Modo de testes local. Ideal para testar fluxos rápido sem necessidade de internet ou contas reias.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    E-mail de Simulação
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="usuario@bioentregas.com"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Senha de Simulação
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white font-sans font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-[0.98] shadow-md cursor-pointer"
                >
                  Entrar no Simulador Local
                  <ArrowRight className="h-4 w-4 text-amber-400" />
                </button>
              </form>

              {/* Quick Login Shortcuts */}
              <div className="my-5 flex items-center justify-between text-slate-400">
                <span className="h-px w-[32%] bg-slate-200"></span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                  Atalhos Rápidos
                </span>
                <span className="h-px w-[32%] bg-slate-200"></span>
              </div>

              <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@bioentregas.com', 'ADMIN', 'Coordenação Geral')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/55 p-3 text-left transition-all hover:bg-slate-100 hover:border-slate-200 active:scale-[0.99] group cursor-pointer"
                  id="btn-login-admin"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-biomig-navy text-white shadow-xs">
                      <Shield className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Administrativo</h4>
                      <p className="text-[10px] text-slate-500 font-mono">admin@bioentregas.com (admin123)</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-biomig-navy transition-transform group-hover:translate-x-0.5" />
                </button>

                {drivers.map((drv) => (
                  <button
                    key={drv.email}
                    type="button"
                    onClick={() => handleQuickLogin(drv.email, 'DRIVER', drv.name)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/55 p-3 text-left transition-all hover:bg-slate-100 hover:border-slate-200 active:scale-[0.99] group cursor-pointer"
                    id={`btn-login-${drv.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-biomig-lime text-white shadow-xs">
                        <Truck className="h-4.5 w-4.5 text-biomig-navy" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Motorista: {drv.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{drv.email} (motorista123)</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-biomig-lime transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 py-3.5 text-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <Activity className="h-3 w-3 text-emerald-500 animate-pulse" /> MVP Operacional Externo
          </p>
        </div>
      </motion.div>
    </div>
  );
}
