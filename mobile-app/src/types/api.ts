export type TipoItem = 'REMEDIO' | 'HABITO';
export type StatusRegistro = 'PENDENTE' | 'TOMADO' | 'ESQUECIDO';

export interface Usuario {
  idUsuario: number;
  uuidDispositivo: string;
  nome: string;
  dtCriacao: string;
}

export interface Item {
  idItem: number;
  tipo: TipoItem;
  nome: string;
  dose: string | null;
  qtdPorDose: number;
  estoqueAtual: number | null;
  diasSemana: string;
  ativo: boolean;
  dtCriacao: string;
  horarios: { idHorario: number; hora: string }[];
}

export interface ItemInput {
  tipo: TipoItem;
  nome: string;
  dose: string | null;
  qtdPorDose: number;
  estoqueInicial?: number;
  diasSemana: string;
  horarios: string[];
}

export interface Registro {
  idRegistro: number;
  idItem: number;
  idHorario: number;
  nome: string;
  tipo: TipoItem;
  dose: string | null;
  qtdPorDose: number;
  dtPrevista: string;
  dtTomada: string | null;
  status: StatusRegistro;
}

export interface Estoque {
  idItem: number;
  nome: string;
  estoqueAtual: number;
  consumoSemanal: number;
  primeiraDoseSemSaldo: string | null;
  precisaReposicao: boolean;
}

export interface Movimento {
  idMovimento: number;
  idItem: number;
  idRegistro: number | null;
  tipo: 'BAIXA' | 'REPOSICAO';
  quantidade: number;
  dtMovimento: string;
}

export interface Adesao {
  idItem: number;
  nome: string;
  tipo: TipoItem;
  totalPrevisto: number;
  totalTomado: number;
  totalEsquecido: number;
  totalPendente: number;
  percentualAdesao: number;
}

export interface Relatorio {
  inicioSemana: string;
  fimSemana: string;
  itens: Adesao[];
}

export interface Pagina<T> {
  conteudo: T[];
  pagina: number;
  tamanho: number;
  temProxima: boolean;
}

