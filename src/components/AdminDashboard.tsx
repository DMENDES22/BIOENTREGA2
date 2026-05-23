import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, MapPin, User, Clock, 
  CheckCircle2, AlertTriangle, Box, FileText, 
  ExternalLink, LogOut, RefreshCcw, History, 
  Truck, ArrowRight, ClipboardList, PlusCircle, Check, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Delivery, DeliveryStatus } from '../types';

interface AdminDashboardProps {
  deliveries: Delivery[];
  onCreateDelivery: (newDelivery: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt' | 'occurrences' | 'status'>) => void;
  onLogout: () => void;
  adminName: string;
  drivers: { name: string; email: string }[];
}

export default function AdminDashboard({ deliveries, onCreateDelivery, onLogout, adminName, drivers }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'history'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [driverFilter, setDriverFilter] = useState<string>('TODOS');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Computed local list of drivers names
  const driversList = useMemo(() => {
    return drivers.map(d => d.name);
  }, [drivers]);

  // Form states
  const [nfNumber, setNfNumber] = useState('');
  const [volumes, setVolumes] = useState(1);
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [assignedDriver, setAssignedDriver] = useState(() => {
    return drivers.length > 0 ? drivers[0].name : '';
  });
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Statistics
  const stats = useMemo(() => {
    const total = deliveries.length;
    const pending = deliveries.filter(d => d.status === 'PENDENTE').length;
    const inRoute = deliveries.filter(d => d.status === 'EM_ROTA').length;
    const delivered = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const problems = deliveries.filter(d => d.status === 'PROBLEMA').length;
    return { total, pending, inRoute, delivered, problems };
  }, [deliveries]);

  // Handle create delivery submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfNumber || !clientName || !address) {
      setFormError('Por favor, preencha os campos obrigatórios (NF, Local e Endereço).');
      return;
    }

    onCreateDelivery({
      invoiceNumber: nfNumber,
      volumes: Number(volumes),
      clientName,
      address,
      observations,
      assignedDriver
    });

    // Reset Form
    setNfNumber('');
    setVolumes(1);
    setClientName('');
    setAddress('');
    setObservations('');
    setAssignedDriver(driversList[0] || '');
    setFormError('');
    setFormSuccess(true);
    
    // Auto toggle tab or dismiss success message
    setTimeout(() => {
      setFormSuccess(false);
      setActiveTab('dashboard');
    }, 1500);
  };

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchesSearch = d.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'TODOS' || d.status === statusFilter;
      const matchesDriver = driverFilter === 'TODOS' || d.assignedDriver === driverFilter;

      return matchesSearch && matchesStatus && matchesDriver;
    });
  }, [deliveries, searchQuery, statusFilter, driverFilter]);

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EM_ROTA': return 'bg-biomig-light text-biomig-navy border-biomig-lime/30';
      case 'ENTREGUE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PROBLEMA': return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'EM_ROTA': return 'Em Rota';
      case 'ENTREGUE': return 'Entregue';
      case 'PROBLEMA': return 'Problema';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8 font-sans">
      {/* Admin Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-biomig-light px-3 py-1 text-xs font-black text-biomig-navy border border-biomig-lime/25 shadow-xs">
            Painel de Controle Interno
          </span>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Admin: {adminName}
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe remessas, delegue motoristas e gerencie entregas em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 rounded-xl bg-biomig-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-biomig-hover hover:shadow-md hover:shadow-biomig-navy/25 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 text-biomig-lime" />
            Nova Entrega
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sair
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="mb-6 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`border-b-2 py-3 px-4 text-sm transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-biomig-lime text-biomig-navy font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-biomig-lime" />
            Painel Geral
          </div>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`border-b-2 py-3 px-4 text-sm transition-colors cursor-pointer ${
            activeTab === 'create'
              ? 'border-biomig-lime text-biomig-navy font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-biomig-lime" />
            Cadastrar Entrega
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 py-3 px-4 text-sm transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-biomig-lime text-biomig-navy font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-biomig-lime" />
            Histórico de Ocorrências
          </div>
        </button>
      </div>

      {/* Active Tab rendering */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
                <Box className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Pendentes</span>
                <Clock className="h-5 w-5" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-amber-800">{stats.pending}</p>
            </div>

            <div className="rounded-xl border border-biomig-lime bg-biomig-light/25 p-4 shadow-sm">
              <div className="flex items-center justify-between text-biomig-navy">
                <span className="text-xs font-semibold uppercase tracking-wider text-biomig-navy opacity-80">Em Rota</span>
                <Truck className="h-5 w-5 text-biomig-lime" />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-biomig-navy">{stats.inRoute}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Entregues</span>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-800">{stats.delivered}</p>
            </div>

            <div className="col-span-2 rounded-xl border border-rose-200 bg-rose-50/20 p-4 shadow-sm sm:col-span-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">Problemas</span>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-rose-800">{stats.problems}</p>
            </div>
          </div>

          {/* Filters and List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h3 className="font-sans text-lg font-bold text-slate-800">
                Monitoramento Operacional
              </h3>
              
              {/* Filter controls */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:items-center">
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar NF, cliente..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light"
                  />
                </div>

                {/* Status selector */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition-all focus:border-biomig-navy focus:bg-white"
                  >
                    <option value="TODOS">Status: Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_ROTA">Em Rota</option>
                    <option value="ENTREGUE">Entregue</option>
                    <option value="PROBLEMA">Problemas</option>
                  </select>
                </div>

                {/* Driver selector */}
                <div className="relative">
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition-all focus:border-biomig-navy focus:bg-white"
                  >
                    <option value="TODOS">Motorista: Todos</option>
                    {driversList.map(driver => (
                      <option key={driver} value={driver}>{driver}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Grid list of entries */}
            {filteredDeliveries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
                <Box className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Nenhuma entrega encontrada.</p>
                <p className="text-xs text-slate-400">Ajuste os filtros ou cadastre novas NF no botão acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm" id="deliveries-table">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Nota Fiscal</th>
                      <th className="py-3 px-4">Local / Destinatário</th>
                      <th className="py-3 px-4">Endereço</th>
                      <th className="py-3 px-4">Volumes</th>
                      <th className="py-3 px-4">Motorista</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDeliveries.map((delivery) => (
                      <tr 
                        key={delivery.id} 
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                          {delivery.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 line-clamp-1">{delivery.clientName}</p>
                          {delivery.createdAt && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Criado em: {new Date(delivery.createdAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-600 leading-tight line-clamp-1 max-w-xs text-xs">{delivery.address}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-center font-bold text-slate-700">
                          {delivery.volumes}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="block h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            {delivery.assignedDriver || 'Sem Alocação'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusColor(delivery.status)}`}>
                            {getStatusLabel(delivery.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedDelivery(delivery)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver Ocorrências
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-biomig-light text-biomig-navy border border-biomig-lime/20">
              <PlusCircle className="h-5 w-5 text-biomig-lime" />
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold text-slate-900">
                Formulário de Cadastro
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados da remessa física para gerar um código interno para o motorista.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formSuccess && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-sm font-semibold text-emerald-800"
              >
                <Check className="h-5 w-5 text-emerald-600" />
                Entrega registrada com sucesso no sistema Biomig!
              </motion.div>
            )}

            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-sm font-semibold text-rose-800">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Número da NF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 003256"
                  value={nfNumber}
                  onChange={(e) => setNfNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3.5 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-mono font-medium"
                  id="input-nf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Quantidade de Volumes <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={volumes}
                  onChange={(e) => setVolumes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3.5 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-mono font-medium"
                  id="input-volumes"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nome do Local de Entrega <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Hospital das Clínicas Setor B"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3.5 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-medium"
                id="input-cliente"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Endereço Completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-400">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <textarea
                  required
                  placeholder="Rua, número, bairro, cidade e estado"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-medium"
                  id="input-endereco"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Motorista Designado
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <select
                  value={assignedDriver}
                  onChange={(e) => setAssignedDriver(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light"
                  id="select-motorista"
                >
                  {driversList.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Observações Operacionais
              </label>
              <textarea
                placeholder="Horário limite, nome do responsável local, código de portaria..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3.5 text-sm outline-none transition-all focus:border-biomig-navy focus:bg-white focus:ring-2 focus:ring-biomig-light font-medium"
                id="input-observacoes"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-biomig-navy py-3 text-sm font-bold text-white transition-all hover:bg-biomig-hover active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-biomig-navy/20 cursor-pointer"
                id="btn-confirmar-cadastro"
              >
                Cadastrar Remessa Interna
                <ArrowRight className="h-4 w-4 text-biomig-lime" />
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="font-sans text-lg font-bold text-slate-900">Histórico de Ocorrências Logísticas</h3>
              <p className="text-xs text-slate-400">Linha do tempo consolidada e auditória de ações realizadas pelos motoristas.</p>
            </div>

            {/* List all logistics occurrences dynamically */}
            <div className="space-y-4">
              {deliveries.filter(d => d.occurrences && d.occurrences.length > 0).map((delivery) => (
                <div key={delivery.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex flex-col justify-between gap-2 border-b border-slate-200/60 pb-3 sm:flex-row sm:items-center">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-400">NF {delivery.invoiceNumber}</span>
                      <h4 className="font-sans text-sm font-bold text-slate-800">{delivery.clientName}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold">{delivery.assignedDriver}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusColor(delivery.status)}`}>
                        {getStatusLabel(delivery.status)}
                      </span>
                    </div>
                  </div>

                  {/* Occurrence Sub-timeline */}
                  <div className="mt-3.5 space-y-3 pl-2">
                    {delivery.occurrences.map((oc, i) => (
                      <div key={oc.id} className="relative flex gap-3 text-xs">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 h-2 w-2 rounded-full ${
                            oc.status === 'ENTREGUE' ? 'bg-emerald-500' :
                            oc.status === 'EM_ROTA' ? 'bg-biomig-lime' :
                            oc.status === 'PROBLEMA' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          {i < delivery.occurrences.length - 1 && (
                            <div className="h-full w-0.5 bg-slate-200 mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-600">
                              {getStatusLabel(oc.status)}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(oc.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="mt-0.5 text-slate-600 pr-4">{oc.notes || 'Sem comentários adicionais.'}</p>
                          
                          {/* Receipt Data display */}
                          {(oc.receiverName || oc.location || oc.photo || oc.signature) && (
                            <div className="mt-2 rounded-lg bg-white border border-slate-200 p-2.5 max-w-md space-y-1.5 shadow-xs">
                              {oc.receiverName && (
                                <p className="text-[11px] text-slate-700">
                                  <strong>Responsável p/ Recebimento:</strong> {oc.receiverName}
                                </p>
                              )}
                              {oc.location && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  <span>
                                    GPS Coletas: lat {oc.location.latitude.toFixed(5)}, lng {oc.location.longitude.toFixed(5)}
                                  </span>
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${oc.location.latitude},${oc.location.longitude}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 font-bold text-biomig-navy hover:text-biomig-lime hover:underline"
                                  >
                                    Ver no Mapa <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              )}
                              
                              {oc.photo && (
                                <div className="mt-1">
                                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Foto comprovante:</p>
                                  <img 
                                    src={oc.photo} 
                                    alt="Comprovante de entrega" 
                                    className="max-h-24 rounded-lg object-contain border border-slate-200 bg-slate-100"
                                    onError={(e) => {
                                      // Fallback on error
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}

                              {oc.signature && (
                                <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Assinatura Digital:</p>
                                  <div className="inline-block rounded-lg border border-slate-250 bg-slate-50 p-1">
                                    <img 
                                      src={oc.signature} 
                                      alt="Assinatura Digital" 
                                      className="max-h-16 h-12 object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Overlay / Modal for logs lookup */}
      <AnimatePresence>
        {selectedDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
              id="details-modal"
            >
              <div className="bg-slate-900 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Nota Fiscal #{selectedDelivery.invoiceNumber}</span>
                    <h3 className="text-md font-bold leading-tight">{selectedDelivery.clientName}</h3>
                  </div>
                  <span className={`rounded-xl border px-2.5 py-0.5 text-xs font-bold ${getStatusColor(selectedDelivery.status)}`}>
                    {getStatusLabel(selectedDelivery.status)}
                  </span>
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Volumes</p>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{selectedDelivery.volumes}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Motorista Alocado</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedDelivery.assignedDriver || "Não alocado"}</p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 mt-1">
                    <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Endereço físico</p>
                    <p className="font-medium text-slate-700 leading-tight mt-0.5">{selectedDelivery.address}</p>
                  </div>
                  {selectedDelivery.observations && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 mt-1">
                      <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Sinalização / Observações</p>
                      <p className="font-medium text-slate-700 italic mt-0.5">"{selectedDelivery.observations}"</p>
                    </div>
                  )}
                </div>

                {/* Timeline in details modal */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Histórico de Movimentação</h4>
                  <div className="space-y-3.5 pl-1.5">
                    {selectedDelivery.occurrences.map((occ, idx) => (
                      <div key={occ.id} className="flex gap-2.5 text-xs">
                        {/* Dot indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 h-2 w-2 rounded-full ${
                            occ.status === 'ENTREGUE' ? 'bg-emerald-500' :
                            occ.status === 'EM_ROTA' ? 'bg-biomig-lime' :
                            occ.status === 'PROBLEMA' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          {idx < selectedDelivery.occurrences.length - 1 && (
                            <div className="h-full w-0.5 bg-slate-200 mt-1" />
                          )}
                        </div>
                        {/* Info details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <div>
                              <p className="font-bold text-slate-700">{getStatusLabel(occ.status)}</p>
                              <p className="text-slate-600 mt-1">{occ.notes || "Ação operacional processada."}</p>
                              {occ.receiverName && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  <strong>Recebido por:</strong> {occ.receiverName}
                                </p>
                              )}
                              
                              {occ.location && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                                  <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                  <span>lat: {occ.location.latitude.toFixed(4)}, lng: {occ.location.longitude.toFixed(4)}</span>
                                </div>
                              )}
                            </div>
                            <span className="font-mono text-[9px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 self-start">
                              {new Date(occ.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>

                          {occ.photo && (
                            <div className="mt-2 pl-1">
                              <img 
                                src={occ.photo} 
                                alt="Foto ocorrência" 
                                className="max-h-40 rounded-lg border border-slate-200 object-contain shadow-xs bg-slate-100"
                              />
                            </div>
                          )}

                          {occ.signature && (
                            <div className="mt-2 pl-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Assinatura Digital:</p>
                              <div className="inline-block rounded-lg border border-slate-200 bg-slate-55 p-1 mt-0.5">
                                <img 
                                  src={occ.signature} 
                                  alt="Assinatura Digital" 
                                  className="max-h-24 h-16 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3.5 text-right border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDelivery(null)}
                  className="rounded-xl bg-slate-800 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-700 active:scale-95 transition-all"
                  id="btn-close-modal"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
