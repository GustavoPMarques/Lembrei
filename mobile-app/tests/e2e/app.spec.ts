import { expect, test, type Page } from '@playwright/test';
import type { Item, ItemInput, Movimento, Registro } from '../../src/types/api';

async function mockApi(page: Page, insufficient = false) {
  let items: Item[] = [];
  let record: Registro | null = null;
  let stock = insufficient ? 0 : 10;
  let userName = 'Você';
  let uuid = '';
  let replacements = 0;
  const movements: Movimento[] = [];
  const stockResult = () => ({ idItem: 1, nome: items[0]?.nome, estoqueAtual: stock, consumoSemanal: 7,
    primeiraDoseSemSaldo: '2026-11-15T08:00:00', precisaReposicao: stock < 4 });
  const paginate = (values: unknown[]) => ({ conteudo: values, pagina: 0, tamanho: 50, temProxima: false });
  const makeRecord = () => {
    if (items.length && !record) record = { idRegistro: 8, idItem: 1, idHorario: 1, nome: items[0].nome,
      tipo: items[0].tipo, dose: items[0].dose, qtdPorDose: items[0].qtdPorDose,
      dtPrevista: '2026-11-11T00:00:00', dtTomada: null, status: 'PENDENTE' };
  };
  await page.clock.setFixedTime(new Date('2026-11-11T18:00:00Z'));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();
    let response: unknown;
    let status = 200;
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } }); return; }
    if (path === '/usuarios/identificar') {
      uuid = request.postDataJSON().uuidDispositivo;
      response = { idUsuario: 1, uuidDispositivo: uuid, nome: userName, dtCriacao: '2026-11-11T08:00:00' };
    } else {
      expect(request.headers()['x-dispositivo-id']).toBe(uuid);
      if (path === '/usuarios/me') {
        if (method === 'PUT') userName = request.postDataJSON().nome;
        response = { idUsuario: 1, uuidDispositivo: uuid, nome: userName, dtCriacao: '2026-11-11T08:00:00' };
      } else if (path === '/itens' && method === 'POST') {
        const input = request.postDataJSON() as ItemInput;
        stock = insufficient ? 0 : input.estoqueInicial ?? 0;
        const item: Item = { ...input, idItem: 1, estoqueAtual: input.tipo === 'HABITO' ? null : stock,
          ativo: true, dtCriacao: '2026-11-11T08:00:00', horarios: input.horarios.map((hora, i) => ({ idHorario: i + 1, hora })) };
        items = [item]; response = item; status = 201;
      } else if (path === '/itens') {
        const active = url.searchParams.get('ativo');
        response = paginate(items.filter((i) => active === null || i.ativo === (active === 'true')));
      } else if (path === '/itens/1/ativo') {
        items = items.map((i) => ({ ...i, ativo: request.postDataJSON().ativo })); response = items[0];
      } else if (path === '/itens/1') {
        if (method === 'PUT') {
          const input = request.postDataJSON() as ItemInput;
          items = [{ ...items[0], ...input, horarios: input.horarios.map((hora, i) => ({ idHorario: i + 1, hora })) }];
        }
        response = { ...items[0], estoqueAtual: stock };
      }
      else if (path === '/itens/1/estoque') response = stockResult();
      else if (path === '/itens/1/movimentos') response = paginate(movements);
      else if (path === '/itens/1/reposicoes') {
        const quantity = request.postDataJSON().quantidade;
        stock += quantity; replacements++;
        movements.unshift({ idMovimento: movements.length + 1, idItem: 1, idRegistro: null, tipo: 'REPOSICAO', quantidade: quantity, dtMovimento: '2026-11-11T15:00:00' });
        response = stockResult();
      } else if (path === '/alertas/estoque') response = paginate(stock < 4 && items.length ? [stockResult()] : []);
      else if (path === '/rotina/gerar') { makeRecord(); response = { quantidadeGerada: 1 }; }
      else if (path === '/rotina') { makeRecord(); response = paginate(record ? [record] : []); }
      else if (path === '/registros/8/confirmar') {
        if (stock === 0) { status = 409; response = { mensagem: 'Estoque insuficiente. Reponha antes de confirmar.' }; }
        else {
          if (record?.status !== 'TOMADO') { stock--; movements.unshift({ idMovimento: 1, idItem: 1, idRegistro: 8, tipo: 'BAIXA', quantidade: 1, dtMovimento: '2026-11-11T15:00:00' }); }
          record = { ...record!, status: 'TOMADO', dtTomada: '2026-11-11T15:00:00' }; response = record;
        }
      } else if (path === '/relatorios/semanal') response = { inicioSemana: '2026-11-09', fimSemana: '2026-11-15', itens: items.length ? [{ idItem: 1, nome: items[0].nome,
        tipo: items[0].tipo, totalPrevisto: 1, totalTomado: record?.status === 'TOMADO' ? 1 : 0, totalEsquecido: 0,
        totalPendente: record?.status === 'TOMADO' ? 0 : 1, percentualAdesao: record?.status === 'TOMADO' ? 100 : 0 }] : [] };
      else { status = 404; response = { mensagem: `Endpoint de teste não previsto: ${method} ${path}` }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response), headers: { 'access-control-allow-origin': '*' } });
  });
  return { getStock: () => stock, getReplacements: () => replacements, getUuid: () => uuid };
}

async function createCare(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Um cuidado de cada vez.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar cuidado', exact: true }).click();
  await page.getByLabel('Nome do remédio', { exact: true }).fill('Remédio de teste');
  await page.getByLabel('Quantidade em estoque', { exact: true }).fill('10');
  await page.getByLabel('Horário 1', { exact: true }).fill('00:00');
  await page.getByRole('button', { name: 'Salvar cuidado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar cuidado', exact: true })).toBeVisible();
}

test('cadastro, confirmação, reposição e relatório funcionam sem login', async ({ page }) => {
  const state = await mockApi(page);
  await createCare(page);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Já tomei', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, confirmar', exact: true }).click();
  await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
  expect(state.getStock()).toBe(9);
  await page.getByText('Estoque', { exact: true }).click();
  await page.getByRole('button', { name: 'Ver estoque e repor', exact: true }).click();
  await page.getByLabel('Quantidade para adicionar', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Registrar reposição', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, adicionar ao estoque', exact: true }).click();
  await expect(page.getByText('Reposição registrada. Seu estoque foi atualizado.')).toBeVisible();
  expect(state.getStock()).toBe(14);
  expect(state.getReplacements()).toBe(1);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByText('Progresso', { exact: true }).click();
  await expect(page.getByText('Uma semana de cuidados em dia!', { exact: true })).toBeVisible();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir ajustes', exact: true })).toBeVisible();
});

test('UUID persiste, ajustes de nome funcionam e notificações foram removidas', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/');
  await expect(page.getByText('Um cuidado de cada vez.', { exact: true })).toBeVisible();
  const first = state.getUuid();
  await page.reload();
  await expect(page.getByText('Um cuidado de cada vez.', { exact: true })).toBeVisible();
  expect(state.getUuid()).toBe(first);
  await page.getByLabel('Abrir ajustes').click();
  await page.getByLabel('Seu nome', { exact: true }).fill('Maria');
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click();
  await expect(page.getByText('Seu nome foi atualizado.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Ativar lembretes locais')).toHaveCount(0);
  await expect(page.getByText('Testar notificação')).toHaveCount(0);
  await expect(page.getByText('Abrir permissões do celular')).toHaveCount(0);
});

test('URL configurada substitui IP antigo uma vez e preserva ajustes posteriores', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('lembrei.test-connection-seeded')) {
      localStorage.setItem('lembrei.api-url', 'http://192.168.1.99:8080/api/v1');
      localStorage.removeItem('lembrei.configured-api-url');
      localStorage.setItem('lembrei.test-connection-seeded', 'true');
    }
  });
  await page.goto('/');
  await expect(page.getByText('Um cuidado de cada vez.', { exact: true })).toBeVisible();
  const configured = await page.evaluate(() => localStorage.getItem('lembrei.configured-api-url'));
  expect(configured).toBeTruthy();
  await page.getByLabel('Abrir ajustes').click();
  await expect(page.getByLabel('Endereço do servidor', { exact: true })).toHaveValue(configured!);
  await page.getByLabel('Endereço do servidor', { exact: true }).fill('http://localhost:9090/api/v1');
  await page.getByRole('button', { name: 'Salvar e conectar', exact: true }).click();
  await expect(page.getByText('Configuração salva. Confira o estado da conexão acima.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Endereço do servidor', { exact: true })).toHaveValue('http://localhost:9090/api/v1');
});

test('erro de estoque não confirma a dose nem apresenta sucesso', async ({ page }) => {
  await mockApi(page, true);
  await createCare(page);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Já tomei', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, confirmar', exact: true }).click();
  await expect(page.getByText('Estoque insuficiente. Reponha antes de confirmar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Já tomei', exact: true })).toBeVisible();
  await expect(page.getByText('Concluído', { exact: true })).toHaveCount(0);
});

test('falha de conexão permite configurar o servidor sem login', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByText('Vamos reconectar?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Configurar conexão', exact: true }).click();
  await expect(page.getByLabel('Endereço do servidor', { exact: true })).toBeVisible();
  await expect(page.getByText('Sem conexão', { exact: true })).toBeVisible();
});

test('edição e arquivamento preservam o cuidado e permitem reativar', async ({ page }) => {
  await mockApi(page);
  await createCare(page);
  await page.getByRole('button', { name: 'Editar cuidado', exact: true }).click();
  await page.getByLabel('Nome do remédio', { exact: true }).fill('Cuidado editado');
  await expect(page.getByLabel('Quantidade em estoque', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByText('Cuidado editado', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar cuidado', exact: true }).click();
  await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reativar cuidado', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reativar cuidado', exact: true }).click();
  await page.getByRole('button', { name: 'Reativar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arquivar cuidado', exact: true })).toBeVisible();
});
