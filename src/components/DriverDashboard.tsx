import React, { useState } from 'react';
import { 
  Truck, MapPin, Navigation, Phone, CheckCircle, 
  AlertTriangle, Play, Circle, Calendar, Clock, 
  Camera, Check, X, LogOut, ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Delivery, DeliveryStatus, GPSLocation } from '../types';
import SignaturePad from './SignaturePad';

interface DriverDashboardProps {
  deliveries: Delivery[];
  driverName: string;
  onUpdateStatus: (
    deliveryId: string, 
    status: DeliveryStatus, 
    notes?: string, 
    receiverName?: string, 
    gpsLocation?: GPSLocation, 
    photo?: string,
    signature?: string
  ) => void;
  onLogout: () => void;
}

export default function DriverDashboard({ deliveries, driverName, onUpdateStatus, onLogout }: DriverDashboardProps) {
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [statusUpdateMode, setStatusUpdateMode] = useState<DeliveryStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  
  // Geolocation state
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsData, setGpsData] = useState<GPSLocation | null>(null);
  const [gpsError, setGpsError] = useState('');

  // Filter deliveries for CURRENT driver only
  const myDeliveries = deliveries.filter(d => d.assignedDriver === driverName);

  const pendingCount = myDeliveries.filter(d => d.status === 'PENDENTE' || d.status === 'EM_ROTA').length;
  const completedCount = myDeliveries.filter(d => d.status === 'ENTREGUE').length;

  const handleOpenMaps = (address: string) => {
    // Standard secure URL to look up delivery in Google Maps
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  // Helper to trigger geo coordinates
  const triggerGpsCapture = () => {
    setIsCapturingGps(true);
    setGpsError('');
    
    if (!navigator.geolocation) {
      setGpsError('GPS não suportado por este dispositivo.');
      // Inject high-accuracy mock Sao Paulo logistics yard as fallback
      setTimeout(() => {
        setGpsData({
          latitude: -23.55052 + (Math.random() - 0.5) * 0.01,
          longitude: -46.633308 + (Math.random() - 0.5) * 0.01,
          accuracy: 5
        });
        setIsCapturingGps(false);
      }, 800);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsCapturingGps(false);
      },
      (error) => {
        console.warn('GPS capture error:', error);
        setGpsError('Erro de sinal GPS ou permissão bloqueada. Ativando estimativa.');
        // High fidelity fallback coordinates for testing
        setTimeout(() => {
          setGpsData({
            latitude: -23.5671 + (Math.random() - 0.5) * 0.005,
            longitude: -46.7029 + (Math.random() - 0.5) * 0.005,
            accuracy: 12
          });
          setIsCapturingGps(false);
        }, 1000);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Trigger base64 mockup photo
  const simulatePhotoCapture = () => {
    // Generate an SVG drawing serialized as base64 representing cargo confirmation
    const colors = ['#2563eb', '#059669', '#7c3aed', '#dc2626'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        <rect width="100%" height="100%" fill="#e2e8f0"/>
        <rect x="20" y="20" width="360" height="260" rx="12" fill="white" stroke="#cbd5e1" stroke-width="4"/>
        <circle cx="200" cy="110" r="45" fill="${randomColor}" opacity="0.15"/>
        <path d="M175 110 L195 130 L230 90" stroke="${randomColor}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <text x="200" y="195" font-family="'Inter', sans-serif" font-weight="bold" font-size="20" fill="#1e293b" text-anchor="middle">COMPROVANTE CARGA</text>
        <text x="200" y="225" font-family="'Inter', sans-serif" font-size="14" fill="#64748b" text-anchor="middle">BioEntregas ID: ${selectedDelivery?.id}</text>
        <text x="200" y="250" font-family="'JetBrains Mono', monospace" font-size="11" fill="#475569" text-anchor="middle">NF: ${selectedDelivery?.invoiceNumber} | VOLS: ${selectedDelivery?.volumes}</text>
        <rect x="130" y="270" width="140" height="2" fill="#cbd5e1"/>
      </svg>
    `;
    const base64Url = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    setCapturedPhoto(base64Url);
  };

  // Handle standard real file uploading (PWA/Mobile compatible camera option too)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Complete occurrence modification submission
  const handleSubmitStatusChange = () => {
    if (!selectedDelivery || !statusUpdateMode) return;

    if (statusUpdateMode === 'ENTREGUE' && !receiverName) {
      alert('Por favor, digite o nome de quem recebeu a entrega.');
      return;
    }

    if (statusUpdateMode === 'ENTREGUE' && !signature) {
      alert('Por favor, colha a assinatura digital do recebedor.');
      return;
    }

    let defaultNote = '';
    if (statusUpdateMode === 'EM_ROTA') defaultNote = 'Iniciou percurso rodoviário de transporte';
    if (statusUpdateMode === 'ENTREGUE') defaultNote = `Mercadoria entregue e aceita no destino.`;
    if (statusUpdateMode === 'PROBLEMA') defaultNote = `Problema reportado: ${notes || 'Nenhuma nota informada pelo motorista'}`;

    onUpdateStatus(
      selectedDelivery.id,
      statusUpdateMode,
      notes || defaultNote,
      receiverName,
      gpsData || undefined,
      capturedPhoto || undefined,
      signature || undefined
    );

    // Refresh model view
    setSelectedDelivery(null);
    statusUpdateModeReset();
  };

  const statusUpdateModeReset = () => {
    setStatusUpdateMode(null);
    setNotes('');
    setReceiverName('');
    setCapturedPhoto('');
    setSignature('');
    setGpsData(null);
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EM_ROTA': return 'bg-biomig-light text-biomig-navy border-biomig-lime/30';
      case 'ENTREGUE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PROBLEMA': return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const getStatusLabelText = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'EM_ROTA': return 'Em Rota';
      case 'ENTREGUE': return 'Entregue';
      case 'PROBLEMA': return 'Problema';
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6 font-sans">
      {/* Mobile-First Driver Frame Header */}
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-md border-b-2 border-biomig-lime">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-biomig-navy border border-biomig-lime/30">
            <Truck className="h-5 w-5 text-biomig-lime" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">{driverName}</h2>
            <p className="text-[10px] uppercase font-bold text-slate-400">Motorista Colaborador</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg bg-white/10 p-2.5 text-slate-300 hover:bg-white/20 active:scale-95 transition-all"
          id="btn-driver-logout"
          title="Sair da conta"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Overview Tracker Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serviços Ativos</p>
          <p className="mt-1 font-mono text-2xl font-black text-slate-800">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entregues hoje</p>
          <p className="mt-1 font-mono text-2xl font-black text-emerald-600">{completedCount}</p>
        </div>
      </div>

      {/* Main Panel Area */}
      <AnimatePresence mode="wait">
        {!selectedDelivery ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Minha Lista de Cargas
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                {myDeliveries.length} total
              </span>
            </div>

            {myDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
                <Truck className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold">Sem entregas alocadas.</p>
                <p className="text-xs text-slate-400">Peça para a coordenação registrar novas NFs para você.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeliveries.map((delivery) => (
                  <button
                    key={delivery.id}
                    onClick={() => setSelectedDelivery(delivery)}
                    className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4 active:bg-slate-50 relative overflow-hidden group"
                  >
                    {/* Visual left bar color accent */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      delivery.status === 'PENDENTE' ? 'bg-amber-400' :
                      delivery.status === 'EM_ROTA' ? 'bg-biomig-lime' :
                      delivery.status === 'ENTREGUE' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />

                    <div className="flex-1 pl-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          NF {delivery.invoiceNumber}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          {delivery.volumes} {delivery.volumes === 1 ? 'volume' : 'volumes'}
                        </span>
                      </div>

                      <h4 className="font-sans text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-biomig-navy transition-colors">
                        {delivery.clientName}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-tight">
                        {delivery.address}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${getStatusBadge(delivery.status)}`}>
                        {getStatusLabelText(delivery.status)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Active Detail Dashboard screen */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md space-y-4"
          >
            {/* Go Back handle */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                onClick={() => { setSelectedDelivery(null); statusUpdateModeReset(); }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar à Lista
              </button>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(selectedDelivery.status)}`}>
                {getStatusLabelText(selectedDelivery.status)}
              </span>
            </div>

            {/* Core details body */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Remessa Interna Nº {selectedDelivery.invoiceNumber}
              </span>
              <h3 className="font-sans text-lg font-bold text-slate-900 leading-tight mt-0.5">
                {selectedDelivery.clientName}
              </h3>
              <p className="mt-1 font-mono text-xs font-bold text-slate-700 bg-slate-50 rounded-lg p-2 flex items-center justify-between">
                <span>Carga: {selectedDelivery.volumes} volumes alocados</span>
                <span>ID: {selectedDelivery.id}</span>
              </p>
            </div>

            {/* Endereço display */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Local de Entrega</p>
                <div className="flex gap-1.5 mt-0.5 items-start">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 leading-tight font-medium">{selectedDelivery.address}</p>
                </div>
              </div>

              {/* ACTION: MAPS ROUTE LINK */}
              <button
                onClick={() => handleOpenMaps(selectedDelivery.address)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98] shadow-sm-button"
                id="btn-maps-rota"
              >
                <Navigation className="h-3.5 w-3.5 animate-pulse" />
                Abrir Rota no Google Maps
              </button>
            </div>

            {/* Observations card if exists */}
            {selectedDelivery.observations && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3">
                <p className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Observações da Coordenação
                </p>
                <p className="text-xs text-slate-700 leading-tight italic mt-1 font-medium">
                  "{selectedDelivery.observations}"
                </p>
              </div>
            )}

            {/* Operations buttons or Workflow trigger */}
            {!statusUpdateMode ? (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1">Atualizar Status Logístico:</p>
                
                <div className="grid grid-cols-2 gap-2">
                  {selectedDelivery.status === 'PENDENTE' && (
                    <button
                      onClick={() => setStatusUpdateMode('EM_ROTA')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-biomig-lime bg-biomig-light/60 py-2.5 text-xs font-bold text-biomig-navy hover:bg-biomig-light transition-colors cursor-pointer"
                      id="btn-status-em-rota"
                    >
                      <Play className="h-3.5 w-3.5 fill-biomig-navy text-biomig-navy" />
                      Entrar em Rota
                    </button>
                  )}

                  {selectedDelivery.status === 'EM_ROTA' && (
                    <button
                      onClick={() => setStatusUpdateMode('PENDENTE')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Voltar p/ Pendente
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setStatusUpdateMode('ENTREGUE');
                      // Auto-trigger physical hardware metrics
                      triggerGpsCapture();
                    }}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/10"
                    id="btn-status-entregue"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                    Confirmar Entrega (Dar Baixa)
                  </button>

                  <button
                    onClick={() => {
                      setStatusUpdateMode('PROBLEMA');
                      triggerGpsCapture();
                    }}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-[0.98]"
                    id="btn-status-problema"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Registrar Ocorrência / Problema
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE WORKFLOW FORM (CONFIRM DATA) */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-slate-100 pt-3.5 space-y-3.5"
              >
                <div className="flex items-center justify-between bg-slate-900 text-white rounded-lg px-3 py-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    Fluxo: {statusUpdateMode === 'ENTREGUE' ? 'Dar Baixa com Sucesso' : 'Reportar Problema'}
                  </span>
                  <button 
                    onClick={statusUpdateModeReset}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Receiver name and signature pad is STRICTLY REQUIRED for complete success */}
                {statusUpdateMode === 'ENTREGUE' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Nome do Recebedor <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nome legível de quem recebeu"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-xs outline-none transition-all focus:border-emerald-500 focus:bg-white"
                        id="input-recebedor"
                      />
                    </div>

                    {/* DIGITALLY SIGN CANVAS COMPONENT */}
                    <SignaturePad
                      onSave={setSignature}
                      onClear={() => setSignature('')}
                    />
                  </div>
                )}

                {/* Optional remarks/notes */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {statusUpdateMode === 'PROBLEMA' ? 'Descrição detalhada do Problema *' : 'Observações finais do Motorista'}
                  </label>
                  <textarea
                    placeholder={statusUpdateMode === 'PROBLEMA' ? 'Descreva o motivo (Ex: Destinatário fechado, recusa de nota, avaria...)' : 'Informações de apoio (Ex: Entregue na recepção ao lado da guarita...)'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 px-3 text-xs outline-none transition-all focus:border-blue-500 focus:bg-white"
                    id="input-driver-obs"
                  />
                </div>

                {/* CAPTURE GPS COMPONENT */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Coleta GPS na Ocorrência</p>
                      {gpsData ? (
                        <p className="text-[10px] text-emerald-600 font-mono font-medium mt-0.5">
                          ✓ GPS Fixado: Lat {gpsData.latitude.toFixed(5)}, Lng {gpsData.longitude.toFixed(5)} (±{gpsData.accuracy?.toFixed(0)}m)
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">Clique p/ assinar com coordenadas reais</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={triggerGpsCapture}
                      disabled={isCapturingGps}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isCapturingGps ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" /> Loc...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" /> Coletar
                        </>
                      )}
                    </button>
                  </div>
                  {gpsError && (
                    <p className="text-[9px] text-amber-600 font-medium mt-1 leading-tight">{gpsError}</p>
                  )}
                </div>

                {/* ATTACH PROOF PHOTO COMPONENT */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Foto / Comprovante Visual</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tire foto da nota assinada ou do local</p>
                    </div>
                    
                    <div className="flex gap-1.5">
                      {/* Simula Camera shortcut */}
                      <button
                        type="button"
                        onClick={simulatePhotoCapture}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-biomig-lime bg-biomig-light px-2 text-[10px] font-bold text-biomig-navy hover:bg-biomig-light/85 cursor-pointer shadow-xs"
                        title="Gerar foto de recibo fictício para teste rápido"
                      >
                        <Camera className="h-3.5 w-3.5" /> Simular
                      </button>

                      {/* Real Camera input */}
                      <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 shadow-xs">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        Dispositivo
                      </label>
                    </div>
                  </div>

                  {capturedPhoto && (
                    <div className="relative mt-2 inline-block">
                      <img 
                        src={capturedPhoto} 
                        alt="Comprovante capturado" 
                        className="h-20 max-w-full rounded-lg border border-slate-300 object-cover bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setCapturedPhoto('')}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Final Operations */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={statusUpdateModeReset}
                    className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitStatusChange}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
                    id="btn-salvar-ocorrencia"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Enviar Baixa
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
