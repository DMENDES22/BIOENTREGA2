import React, { useState, useEffect } from 'react';
import { 
  Truck, Shield, Users, RefreshCw, Layers, EyeOff, Eye, Database, LogIn, Menu, X, Trash2, UserPlus, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  auth, 
  dbService, 
  isCustomFirebaseActive, 
  activeFirebaseType, 
  activeFirebaseProjectId, 
  activeFirebaseConfigDetails,
  handleFirestoreError, 
  OperationType,
  CustomFirebaseConfig
} from './firebase';

import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import { INITIAL_DELIVERIES } from './data/mockDeliveries';
import { Delivery, DeliveryStatus, GPSLocation, User } from './types';

export default function App() {
  const [isRealFirebase, setIsRealFirebase] = useState(false);
  const [showSimulatorBar, setShowSimulatorBar] = useState(true);
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);

  // Custom Firebase Config Form States
  const [dbType, setDbType] = useState<'firestore' | 'rtdb'>(() => {
    return isCustomFirebaseActive ? activeFirebaseType : 'firestore';
  });
  const [customApiKey, setCustomApiKey] = useState(() => {
    return isCustomFirebaseActive ? activeFirebaseConfigDetails.apiKey || '' : '';
  });
  const [customAuthDomain, setCustomAuthDomain] = useState(() => {
    return isCustomFirebaseActive ? activeFirebaseConfigDetails.authDomain || '' : '';
  });
  const [customProjectId, setCustomProjectId] = useState(() => {
    return isCustomFirebaseActive ? activeFirebaseConfigDetails.projectId || '' : '';
  });
  const [customDatabaseURL, setCustomDatabaseURL] = useState(() => {
    return isCustomFirebaseActive ? (activeFirebaseConfigDetails as any).databaseURL || '' : '';
  });
  const [customAppId, setCustomAppId] = useState(() => {
    return isCustomFirebaseActive ? activeFirebaseConfigDetails.appId || '' : '';
  });
  const [firebaseMessage, setFirebaseMessage] = useState<{ type: 'success' | 'error'; text: string }>({ type: 'success', text: '' });

  const handleProjectIdChange = (idVal: string) => {
    setCustomProjectId(idVal);
    if (dbType === 'rtdb') {
      const trimmedId = idVal.trim();
      if (trimmedId) {
        setCustomDatabaseURL(`https://${trimmedId}-default-rtdb.firebaseio.com/`);
      }
    }
  };

  const handleDbTypeChange = (type: 'firestore' | 'rtdb') => {
    setDbType(type);
    if (type === 'rtdb' && !customDatabaseURL && customProjectId.trim()) {
      setCustomDatabaseURL(`https://${customProjectId.trim()}-default-rtdb.firebaseio.com/`);
    }
  };

  const handleSaveCustomFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    setFirebaseMessage({ type: 'success', text: '' });

    const key = customApiKey.trim();
    const project = customProjectId.trim();
    const app = customAppId.trim();

    if (!key || !project || !app) {
      setFirebaseMessage({ type: 'error', text: 'Chaves API Key, Project ID e App ID são obrigatórias.' });
      return;
    }

    const newConfig: CustomFirebaseConfig = {
      apiKey: key,
      authDomain: customAuthDomain.trim() || `${project}.firebaseapp.com`,
      projectId: project,
      appId: app,
      type: dbType,
      databaseURL: dbType === 'rtdb' ? customDatabaseURL.trim() : undefined
    };

    localStorage.setItem('bioentregas_custom_firebase_config', JSON.stringify(newConfig));
    setFirebaseMessage({ type: 'success', text: 'Conectado! O aplicativo será reiniciado...' });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleResetFirebaseConfig = () => {
    if (window.confirm('Deseja desconectar o seu Firebase e reverter para a Nuvem Embutida do AI Studio?')) {
      localStorage.removeItem('bioentregas_custom_firebase_config');
      alert('Banco padrão restaurado! Reiniciando o app...');
      window.location.reload();
    }
  };

  // Driver configuration state
  const [drivers, setDrivers] = useState<{ name: string; email: string }[]>(() => {
    try {
      const stored = localStorage.getItem('bioentregas_drivers_config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading drivers config:', e);
    }
    return [
      { name: 'Carlos Silva', email: 'carlos@bioentregas.com' },
      { name: 'Marcos Oliveira', email: 'marcos@bioentregas.com' },
      { name: 'Fernanda Santos', email: 'fernanda@bioentregas.com' }
    ];
  });

  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [driverMessage, setDriverMessage] = useState<{ type: 'success' | 'error'; text: string }>({ type: 'success', text: '' });

  // Persistence state
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    try {
      const stored = localStorage.getItem('bioentregas_deliveries');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading deliveries state:', e);
    }
    return INITIAL_DELIVERIES;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('bioentregas_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading log state:', e);
    }
    return null;
  });

  // Save drivers configuration when edited
  useEffect(() => {
    localStorage.setItem('bioentregas_drivers_config', JSON.stringify(drivers));
  }, [drivers]);

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverMessage({ type: 'success', text: '' });

    const emailTrimmed = newDriverEmail.trim().toLowerCase();
    const nameTrimmed = newDriverName.trim();

    if (!nameTrimmed || !emailTrimmed) {
      setDriverMessage({ type: 'error', text: 'Nome e e-mail são obrigatórios.' });
      return;
    }

    if (drivers.some((d) => d.email === emailTrimmed)) {
      setDriverMessage({ type: 'error', text: 'Já existe um motorista cadastrado com este e-mail!' });
      return;
    }

    const updatedDrivers = [...drivers, { name: nameTrimmed, email: emailTrimmed }];
    setDrivers(updatedDrivers);
    
    setNewDriverName('');
    setNewDriverEmail('');
    setDriverMessage({ type: 'success', text: `Motorista "${nameTrimmed}" adicionado!` });

    setTimeout(() => {
      setDriverMessage({ type: 'success', text: '' });
    }, 2500);
  };

  const handleDeleteDriver = (emailToDelete: string) => {
    if (currentUser && currentUser.email === emailToDelete) {
      alert('Você não pode excluir o motorista conectado no momento.');
      return;
    }

    if (window.confirm('Excluir este motorista do sistema?')) {
      const updatedDrivers = drivers.filter((d) => d.email !== emailToDelete);
      setDrivers(updatedDrivers);
    }
  };

  // --- 1. Authenticaton Orchestration (Unified Observer) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          let profileData = await dbService.getUserProfile(fbUser.uid);

          if (!profileData) {
            // Check if designated admin email, otherwise default to driver
            const role = fbUser.email === 'admin@bioentregas.com' ? 'ADMIN' : 'DRIVER';
            profileData = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário Google',
              email: fbUser.email || '',
              role: role
            };
            // Persist the user profile to database securely
            await dbService.saveUserProfile(fbUser.uid, profileData);
          }

          const resolvedUser: User = {
            id: profileData.uid || fbUser.uid,
            name: profileData.name,
            email: profileData.email,
            role: profileData.role as 'ADMIN' | 'DRIVER'
          };

          setCurrentUser(resolvedUser);
          setIsRealFirebase(true);
          localStorage.setItem('bioentregas_user', JSON.stringify(resolvedUser));
        } catch (error) {
          console.error("Erro ao syncar cadastro com Firestore/RTDB:", error);
          // Set to state still to guarantee ingress fallback
          const tempUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Google User',
            email: fbUser.email || '',
            role: fbUser.email === 'admin@bioentregas.com' ? 'ADMIN' : 'DRIVER'
          };
          setCurrentUser(tempUser);
          setIsRealFirebase(true);
        }
      } else {
        // If Google account is logged out, check if there was an offline simulated user session
        const storedLocalUser = localStorage.getItem('bioentregas_user');
        if (storedLocalUser) {
          const parsed = JSON.parse(storedLocalUser);
          // Only validate if it was a simulated local user (id does not match google firebase auth)
          if (parsed.id && parsed.id.length < 28 && !parsed.id.startsWith('google-')) {
            setCurrentUser(parsed);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setIsRealFirebase(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 2. Real-Time Deliveries Synchronizer (Unified Realtime Listener) ---
  useEffect(() => {
    if (!isRealFirebase || !currentUser) return;

    const unsubscribe = dbService.subscribeDeliveries(
      currentUser.role,
      currentUser.name,
      currentUser.email,
      (docsData) => {
        setDeliveries(docsData);
      },
      (error) => {
        console.error("Erro na escuta das entregas no Firebase:", error);
      }
    );

    return () => unsubscribe();
  }, [isRealFirebase, currentUser?.id, currentUser?.name, currentUser?.role]);

  // Sync to database
  useEffect(() => {
    if (!isRealFirebase) {
      localStorage.setItem('bioentregas_deliveries', JSON.stringify(deliveries));
    }
  }, [deliveries, isRealFirebase]);

  // Auth delegates (Normal simulator/manual bypass triggers local mode representation)
  const handleLogin = (email: string, role: 'ADMIN' | 'DRIVER', name: string) => {
    if (isRealFirebase) {
      signOut(auth).catch(console.error);
    }
    const id = role === 'ADMIN' ? 'admin' : `drv-${name.toLowerCase().replace(/\s+/g, '-')}`;
    const localUser: User = { id, name, email, role };
    setCurrentUser(localUser);
    setIsRealFirebase(false);
    localStorage.setItem('bioentregas_user', JSON.stringify(localUser));
  };

  const handleLogout = async () => {
    if (isRealFirebase) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Error signing out:", err);
      }
    }
    setCurrentUser(null);
    setIsRealFirebase(false);
    localStorage.removeItem('bioentregas_user');
  };

  // Creation action
  const handleCreateDelivery = async (newDeliveryData: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt' | 'occurrences' | 'status'>) => {
    const timeNow = new Date().toISOString();
    const newId = `del-${Date.now()}`;
    const newDelivery: Delivery = {
      ...newDeliveryData,
      id: newId,
      status: 'PENDENTE',
      createdAt: timeNow,
      updatedAt: timeNow,
      occurrences: [
        {
          id: `occ-${Date.now()}`,
          status: 'PENDENTE',
          timestamp: timeNow,
          notes: 'Entrega lançada e distribuída no painel BioEntregas'
        }
      ]
    };

    if (isRealFirebase) {
      try {
        await dbService.createDelivery(newDelivery);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `deliveries/${newId}`);
      }
    } else {
      setDeliveries((prev) => [newDelivery, ...prev]);
    }
  };

  // Status adjustment action
  const handleUpdateStatus = async (
    deliveryId: string, 
    status: DeliveryStatus, 
    notes?: string, 
    receiverName?: string, 
    gpsLocation?: GPSLocation, 
    photo?: string,
    signature?: string
  ) => {
    const timeNow = new Date().toISOString();
    const newOccId = `occ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newOccurrence = {
      id: newOccId,
      status,
      timestamp: timeNow,
      notes,
      location: gpsLocation,
      receiverName,
      photo,
      signature
    };

    if (isRealFirebase) {
      try {
        // Trace current delivery to bind transition logic
        const targetDelivery = deliveries.find(d => d.id === deliveryId);
        if (!targetDelivery) {
          throw new Error("Não foi possível encontrar a entrega correspondente localmente.");
        }

        const updatedOccurrences = [...(targetDelivery.occurrences || []), newOccurrence];

        const updatedFields: Partial<Delivery> = {
          status,
          updatedAt: timeNow,
          occurrences: updatedOccurrences
        };

        if (status === 'ENTREGUE') {
          updatedFields.completedAt = timeNow;
        }
        if (receiverName) {
          updatedFields.receiverName = receiverName;
        }
        if (photo) {
          updatedFields.photo = photo;
        }
        if (gpsLocation) {
          updatedFields.gpsLocation = gpsLocation;
        }
        if (signature) {
          updatedFields.signature = signature;
        }

        await dbService.updateDelivery(deliveryId, updatedFields);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `deliveries/${deliveryId}`);
      }
    } else {
      setDeliveries((prev) => {
        return prev.map((del) => {
          if (del.id !== deliveryId) return del;

          const updatedOccurrences = [...(del.occurrences || []), newOccurrence];

          return {
            ...del,
            status,
            updatedAt: timeNow,
            completedAt: status === 'ENTREGUE' ? timeNow : del.completedAt,
            receiverName: receiverName || del.receiverName,
            photo: photo || del.photo,
            gpsLocation: gpsLocation || del.gpsLocation,
            signature: signature || del.signature,
            occurrences: updatedOccurrences
          };
        });
      });
    }
  };

  // Quick Switch utility buttons
  const triggerQuickUserSwitch = async (role: 'ADMIN' | 'DRIVER', name: string, email: string) => {
    if (isRealFirebase) {
      await signOut(auth).catch(console.error);
    }
    const localUser: User = {
      id: role === 'ADMIN' ? 'admin' : `drv-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      email,
      role
    };
    setCurrentUser(localUser);
    setIsRealFirebase(false);
    localStorage.setItem('bioentregas_user', JSON.stringify(localUser));
  };

  const resetToDefaultMockData = () => {
    if (window.confirm('Deseja resetar todas as entregas para o estado inicial padrão? (Perca dados locais cadastrados)')) {
      if (isRealFirebase) {
        alert("O reset de dados de simulação não afeta os registros mantidos em tempo real na nuvem do Firebase.");
      } else {
        setDeliveries(INITIAL_DELIVERIES);
        localStorage.setItem('bioentregas_deliveries', JSON.stringify(INITIAL_DELIVERIES));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" id="main-app">
      {/* Simulation/Demo Helper Header Bar */}
      {showSimulatorBar && (
        <div className="border-b border-biomig-lime/30 bg-gradient-to-r from-biomig-navy to-slate-999 text-white font-sans">
          <div className="mx-auto max-w-7xl px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Layers className="h-4 w-4 text-biomig-lime animate-spin-slow" />
              <span>LOGÍSTICA DE PERFIS DE TESTE:</span>
              <span className="text-[10px] bg-biomig-lime/20 text-biomig-lime px-1.5 py-0.5 rounded border border-biomig-lime/30">
                Atalhos Rápidos
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => triggerQuickUserSwitch('ADMIN', 'Coordenação Geral', 'admin@bioentregas.com')}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                  currentUser?.role === 'ADMIN' && !isRealFirebase
                    ? 'bg-biomig-lime text-biomig-navy shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                id="toggle-simulator-admin"
              >
                <Shield className="h-3 w-3" />
                Coordenação (Demo)
              </button>

              {/* Dynamically Render shortcut buttons for all active drivers in the fleet */}
              {drivers.map((drv) => {
                const isSelected = currentUser?.role === 'DRIVER' && currentUser.name === drv.name && !isRealFirebase;
                return (
                  <button
                    key={drv.email}
                    type="button"
                    onClick={() => triggerQuickUserSwitch('DRIVER', drv.name, drv.email)}
                    className={`rounded-lg px-2.5 py-1 font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-biomig-lime text-biomig-navy shadow-sm font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    id={`toggle-simulator-driver-${drv.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Truck className="h-3 w-3" />
                    {drv.name.split(' ')[0]} (Demo)
                  </button>
                );
              })}

              <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>

              <button
                type="button"
                onClick={resetToDefaultMockData}
                className="rounded-lg bg-slate-800 px-2 py-1 font-bold text-amber-400 hover:bg-slate-700 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Limpar localStorage"
              >
                <RefreshCw className="h-3 w-3" /> Reset Local
              </button>

              <button
                onClick={() => setShowSimulatorBar(false)}
                className="text-slate-400 hover:text-white p-1"
                title="Fechar barra"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Top Header with Menu config menu button */}
      <header className="bg-white border-b-2 border-biomig-lime sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9.5 w-9.5 rounded-xl bg-biomig-navy flex items-center justify-center text-white shadow-sm shadow-biomig-navy/20">
              <Truck className="h-5 w-5 text-biomig-lime" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline leading-none">
                <span className="font-sans text-lg font-black text-biomig-navy lowercase">biomig</span>
                <span className="text-[9px] font-black text-[#98c30c] uppercase ml-1">Brasil</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rastreamento e Logística</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className="flex flex-col items-end">
              {isRealFirebase ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {isCustomFirebaseActive 
                      ? `Seu Firebase (${activeFirebaseType?.toUpperCase()})` 
                      : 'Nuvem Embutida (Firestore)'
                    }
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    id: {activeFirebaseProjectId}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Simulador Local
                  </span>
                  <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                    Sem Nuvem
                  </span>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 hidden xs:block" />

            {/* Hamburger Button triggers drawer sidebar */}
            <button
              onClick={() => setIsConfigMenuOpen(true)}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2"
              id="hamburger-config-btn"
              title="Gerenciador de Motoristas (Menu Hambúrguer)"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Config</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Configuration Slide-Over Drawer */}
      <AnimatePresence>
        {isConfigMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100"
              id="config-drawer"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-biomig-light text-biomig-navy flex items-center justify-center border border-biomig-lime/20 animate-pulse">
                    <UserPlus className="h-4.5 w-4.5 text-biomig-lime" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Configurações Gerais</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestão do Quadro de Motoristas</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfigMenuOpen(false)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  id="close-config-drawer-btn"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Drawer Body - list and create */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Form to Create New Driver */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-biomig-navy font-bold text-xs uppercase tracking-wider">
                    <UserPlus className="h-4 w-4 text-biomig-lime" />
                    <span>Cadastrar Novo Motorista</span>
                  </div>

                  <form onSubmit={handleCreateDriver} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Douglas Santos"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-medium"
                        id="new-driver-name"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        E-mail de Login
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Ex: doug@biomig.com"
                        value={newDriverEmail}
                        onChange={(e) => setNewDriverEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-sans font-medium"
                        id="new-driver-email"
                      />
                    </div>

                    {driverMessage.text && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                        driverMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {driverMessage.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-biomig-navy hover:bg-biomig-hover text-white font-bold text-xs py-2.5 cursor-pointer shadow-sm active:scale-[0.98] transition-all"
                      id="btn-add-driver"
                    >
                      <Plus className="h-3.5 w-3.5 text-biomig-lime" /> Adicionar à Frota
                    </button>
                  </form>
                </div>

                {/* Active Drivers List */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Motoristas Ativos ({drivers.length})
                  </p>

                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                    {drivers.map((driver) => (
                      <div key={driver.email} className="py-2.5 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="h-8.5 w-8.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{driver.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{driver.email}</p>
                          </div>
                        </div>

                        {/* Button deletion */}
                        <button
                          type="button"
                          onClick={() => handleDeleteDriver(driver.email)}
                          aria-label={`Excluir motorista ${driver.name}`}
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Firebase Dynamic Connection Panel */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-biomig-navy font-bold text-xs uppercase tracking-wider">
                    <Database className="h-4 w-4 text-biomig-lime" />
                    <span>Conexão Firebase Externa</span>
                  </div>
                  
                  <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                    Preencha as credenciais do seu projeto Firebase (por exemplo, <b className="text-slate-800">bioentregass</b>) para sincronizar entregas e perfis na sua nuvem própria.
                  </p>

                  <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => handleDbTypeChange('firestore')}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        dbType === 'firestore' ? 'bg-white text-biomig-navy shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Cloud Firestore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDbTypeChange('rtdb')}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        dbType === 'rtdb' ? 'bg-white text-biomig-navy shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Realtime DB (RTDB)
                    </button>
                  </div>

                  <form onSubmit={handleSaveCustomFirebase} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Project ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: bioentregass"
                        value={customProjectId}
                        onChange={(e) => handleProjectIdChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        API Key <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="AIzaSy..."
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        App ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 1:123456789:web:abcd123"
                        value={customAppId}
                        onChange={(e) => setCustomAppId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white font-mono"
                      />
                    </div>

                    {dbType === 'rtdb' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Database URL (RTDB) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="https://bioentregass-default-rtdb.firebaseio.com/"
                          value={customDatabaseURL}
                          onChange={(e) => setCustomDatabaseURL(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Auth Domain (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: bioentregass.firebaseapp.com"
                        value={customAuthDomain}
                        onChange={(e) => setCustomAuthDomain(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-1.5 px-3 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white font-mono"
                      />
                    </div>

                    {firebaseMessage.text && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                        firebaseMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {firebaseMessage.text}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-biomig-navy hover:bg-biomig-hover text-white font-bold text-xs py-2.5 cursor-pointer shadow-sm active:scale-[0.98] transition-all text-center"
                      >
                        Salvar e Conectar
                      </button>
                      
                      {isCustomFirebaseActive && (
                        <button
                          type="button"
                          onClick={handleResetFirebaseConfig}
                          className="px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-rose-600 text-slate-500 font-bold text-xs py-2.5 cursor-pointer active:scale-[0.98] transition-all"
                          title="Restaurar banco embutido padrão"
                        >
                          Reverter
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                  <strong>Instruções de Login:</strong> Novos motoristas acessam usando o respectivo e-mail cadastrado e a senha padrão <strong>motorista123</strong>.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toggle simulator visibility fallback */}
      {!showSimulatorBar && (
        <button
          onClick={() => setShowSimulatorBar(true)}
          className="fixed bottom-3 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Abrir barra de simulação"
        >
          <Eye className="h-5 w-5" />
        </button>
      )}

      {/* Main Content routing */}
      <main className="pb-12">
        {!currentUser ? (
          <LoginForm onLogin={handleLogin} drivers={drivers} />
        ) : currentUser.role === 'ADMIN' ? (
          <AdminDashboard 
            deliveries={deliveries}
            onCreateDelivery={handleCreateDelivery}
            onLogout={handleLogout}
            adminName={currentUser.name}
            drivers={drivers}
          />
        ) : (
          <DriverDashboard 
            deliveries={deliveries}
            driverName={currentUser.name}
            onUpdateStatus={handleUpdateStatus}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
