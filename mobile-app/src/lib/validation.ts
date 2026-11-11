import type { ItemInput, TipoItem } from '../types/api';

export interface ItemForm {
  tipo: TipoItem;
  nome: string;
  dose: string;
  quantidade: string;
  estoque: string;
  dias: boolean[];
  horarios: string[];
}

export function positiveInteger(value: string, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= max ? parsed : null;
}

export function itemPayload(form: ItemForm, editing: boolean): ItemInput {
  if (!form.nome.trim() || form.nome.trim().length > 80) throw new Error('Informe um nome com até 80 caracteres.');
  if (form.dose.trim().length > 40) throw new Error('A descrição da dose deve ter até 40 caracteres.');
  const qtd = positiveInteger(form.quantidade, 999);
  if (qtd === null) throw new Error('Informe uma quantidade por dose de 1 a 999.');
  if (!form.dias.some(Boolean)) throw new Error('Selecione pelo menos um dia da semana.');
  if (form.horarios.length < 1 || form.horarios.length > 24) throw new Error('Adicione de 1 a 24 horários.');
  const horarios = form.horarios.map((h) => h.trim());
  if (horarios.some((h) => !h)) throw new Error('Escolha um horário para cada lembrete antes de salvar.');
  if (horarios.some((h) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(h))) throw new Error('Use horários no formato 08:00 ou 20:30.');
  if (new Set(horarios).size !== horarios.length) throw new Error('Os horários não podem se repetir.');
  const payload: ItemInput = {
    tipo: form.tipo, nome: form.nome.trim(), dose: form.dose.trim() || null,
    qtdPorDose: qtd, diasSemana: form.dias.map((d) => d ? '1' : '0').join(''), horarios: horarios.sort(),
  };
  if (form.tipo === 'REMEDIO' && !editing) {
    if (!/^\d+$/.test(form.estoque.trim()) || Number(form.estoque) > 99999) throw new Error('Informe um estoque inicial de 0 a 99.999.');
    payload.estoqueInicial = Number(form.estoque);
  }
  return payload;
}

export function normalizeApiUrl(value: string): string {
  const clean = value.trim().replace(/\/+$/, '');
  let url: URL;
  try { url = new URL(clean); } catch { throw new Error('Informe um endereço válido, começando com http:// ou https://.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use um endereço HTTP ou HTTPS sem credenciais, parâmetros ou fragmentos.');
  }
  if (url.pathname === '/' || url.pathname === '') return `${clean}/api/v1`;
  if (url.pathname !== '/api/v1') throw new Error('O endereço da API deve terminar em /api/v1.');
  return clean;
}
