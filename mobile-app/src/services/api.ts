import type { Usuario, Item, ItemInput, Registro, Estoque, Movimento, Relatorio, Pagina } from '../types/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export class ApiClient {
  constructor(public readonly baseUrl: string, public readonly uuid: string) {}

  async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 35000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Dispositivo-Id': this.uuid },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const fields = result?.campos ? Object.values(result.campos).join(' ') : '';
        throw new ApiError(fields || result?.mensagem || 'Não foi possível concluir essa ação.', response.status);
      }
      return result as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw error;
      throw new ApiError(method === 'GET'
        ? 'Não conseguimos acessar seus dados. Confira se a API está ligada e se a rede está disponível.'
        : 'Não recebemos a resposta da API. Atualize os dados antes de repetir a ação, especialmente uma reposição.', 0);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  identificar(nome: string, signal?: AbortSignal) {
    return this.request<Usuario>('/usuarios/identificar', 'POST', { uuidDispositivo: this.uuid, nome }, signal);
  }
  renomear(nome: string) { return this.request<Usuario>('/usuarios/me', 'PUT', { nome }); }
  itens(pagina = 0, ativo?: boolean, signal?: AbortSignal) {
    return this.request<Pagina<Item>>(`/itens?pagina=${pagina}&tamanho=50${ativo === undefined ? '' : `&ativo=${ativo}`}`, 'GET', undefined, signal);
  }
  item(id: number, signal?: AbortSignal) { return this.request<Item>(`/itens/${id}`, 'GET', undefined, signal); }
  salvarItem(payload: ItemInput, id?: number) { return this.request<Item>(id ? `/itens/${id}` : '/itens', id ? 'PUT' : 'POST', payload); }
  ativar(id: number, ativo: boolean) { return this.request<Item>(`/itens/${id}/ativo`, 'PATCH', { ativo }); }
  rotina(data: string, pagina = 0, signal?: AbortSignal) {
    return this.request<Pagina<Registro>>(`/rotina?data=${data}&pagina=${pagina}&tamanho=50`, 'GET', undefined, signal);
  }
  confirmar(id: number) { return this.request<Registro>(`/registros/${id}/confirmar`, 'POST', {}); }
  esquecer(id: number) { return this.request<Registro>(`/registros/${id}/esquecer`, 'POST'); }
  estoque(id: number, signal?: AbortSignal) { return this.request<Estoque>(`/itens/${id}/estoque`, 'GET', undefined, signal); }
  repor(id: number, quantidade: number) { return this.request<Estoque>(`/itens/${id}/reposicoes`, 'POST', { quantidade }); }
  movimentos(id: number, pagina = 0, signal?: AbortSignal) {
    return this.request<Pagina<Movimento>>(`/itens/${id}/movimentos?pagina=${pagina}&tamanho=50`, 'GET', undefined, signal);
  }
  alertas(pagina = 0, signal?: AbortSignal) { return this.request<Pagina<Estoque>>(`/alertas/estoque?pagina=${pagina}&tamanho=50`, 'GET', undefined, signal); }
  gerar(inicio: string, fim: string, signal?: AbortSignal) {
    return this.request<{ quantidadeGerada: number }>('/rotina/gerar', 'POST', { inicio, fim }, signal);
  }
  relatorio(data: string, signal?: AbortSignal) { return this.request<Relatorio>(`/relatorios/semanal?data=${data}`, 'GET', undefined, signal); }

  async all<T>(loader: (page: number) => Promise<Pagina<T>>): Promise<T[]> {
    const result: T[] = [];
    for (let page = 0; page < 20; page++) {
      const data = await loader(page);
      result.push(...data.conteudo);
      if (!data.temProxima) return result;
    }
    throw new ApiError('Há mais de mil registros nessa consulta. Use filtros ou uma data mais específica.', 422);
  }
}
