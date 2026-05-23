import { Delivery } from '../types';

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'del-1',
    invoiceNumber: '003254',
    volumes: 5,
    clientName: 'Hospital BioVida Central',
    address: 'Av. Paulista, 1250 - Bela Vista, São Paulo - SP',
    observations: 'Entregar na recepção de insumos (subsolo 1). Falar com Cláudia.',
    status: 'PENDENTE',
    assignedDriver: 'Carlos Silva',
    createdAt: '2026-05-21T08:30:00.000Z',
    updatedAt: '2026-05-21T08:30:00.000Z',
    occurrences: [
      {
        id: 'occ-1',
        status: 'PENDENTE',
        timestamp: '2026-05-21T08:30:00.000Z',
        notes: 'Entrega lançada no sistema administrativo'
      }
    ]
  },
  {
    id: 'del-2',
    invoiceNumber: '003255',
    volumes: 2,
    clientName: 'Clínica ProSaúde Jardins',
    address: 'Alameda Lorena, 842 - Jardim Paulista, São Paulo - SP',
    observations: 'Requer assinatura do médico responsável Dr. Roberto.',
    status: 'EM_ROTA',
    assignedDriver: 'Carlos Silva',
    createdAt: '2026-05-21T09:00:00.000Z',
    updatedAt: '2026-05-21T10:15:00.000Z',
    occurrences: [
      {
        id: 'occ-2',
        status: 'PENDENTE',
        timestamp: '2026-05-21T09:00:00.000Z',
        notes: 'Entrega lançada no sistema administrativo'
      },
      {
        id: 'occ-3',
        status: 'EM_ROTA',
        timestamp: '2026-05-21T10:15:00.000Z',
        notes: 'Saída para entrega. Veículo placa ABC1D23.'
      }
    ]
  },
  {
    id: 'del-3',
    invoiceNumber: '003252',
    volumes: 12,
    clientName: 'Laboratório BioAnalítico Pinheiros',
    address: 'Rua Sumidouro, 420 - Pinheiros, São Paulo - SP',
    observations: 'Cargas pesadas. Necessita de carrinho de transporte.',
    status: 'ENTREGUE',
    assignedDriver: 'Marcos Oliveira',
    createdAt: '2026-05-20T14:20:00.000Z',
    updatedAt: '2026-05-20T16:45:00.000Z',
    completedAt: '2026-05-20T16:45:00.000Z',
    receiverName: 'Carlos Eduardo Nogueira',
    gpsLocation: {
      latitude: -23.5671,
      longitude: -46.7029
    },
    occurrences: [
      {
        id: 'occ-4',
        status: 'PENDENTE',
        timestamp: '2026-05-20T14:20:00.000Z',
        notes: 'Entrega lançada no sistema administrativo'
      },
      {
        id: 'occ-5',
        status: 'EM_ROTA',
        timestamp: '2026-05-20T15:00:00.000Z',
        notes: 'Saída para rota de entrega'
      },
      {
        id: 'occ-6',
        status: 'ENTREGUE',
        timestamp: '2026-05-20T16:45:00.000Z',
        receiverName: 'Carlos Eduardo Nogueira',
        notes: 'Entregue sem avarias.',
        location: {
          latitude: -23.5671,
          longitude: -46.7029
        }
      }
    ]
  },
  {
    id: 'del-4',
    invoiceNumber: '003248',
    volumes: 1,
    clientName: 'Hospital Infantil Sabará',
    address: 'Av. Angélica, 1987 - Consolação, São Paulo - SP',
    observations: 'Material refrigerante. Entregar urgente na farmácia clínica.',
    status: 'PROBLEMA',
    assignedDriver: 'Carlos Silva',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-20T12:30:00.000Z',
    occurrences: [
      {
        id: 'occ-7',
        status: 'PENDENTE',
        timestamp: '2026-05-20T10:00:00.000Z',
        notes: 'Entrega registrada.'
      },
      {
        id: 'occ-8',
        status: 'EM_ROTA',
        timestamp: '2026-05-20T11:10:00.000Z',
        notes: 'Motorista em percurso.'
      },
      {
        id: 'occ-9',
        status: 'PROBLEMA',
        timestamp: '2026-05-20T12:30:00.000Z',
        notes: 'Destinatário ausente. Tentativa de contato sem sucesso pelo comercial.',
        location: {
          latitude: -23.5489,
          longitude: -46.6624
        }
      }
    ]
  }
];
