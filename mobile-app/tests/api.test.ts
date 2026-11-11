import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiClient, ApiError } from '../src/services/api';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const api = new ApiClient('http://localhost:8080/api/v1', '123e4567-e89b-42d3-a456-426614174000');

test('cliente envia UUID no cabeçalho e corpo correto para confirmação', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(input, 'http://localhost:8080/api/v1/registros/8/confirmar');
    assert.equal((options?.headers as Record<string, string>)['X-Dispositivo-Id'], api.uuid);
    assert.equal(options?.body, '{}');
    return Response.json({ status: 'TOMADO' });
  };
  assert.equal((await api.confirmar(8)).status, 'TOMADO');
});
test('erro de negócio preserva a mensagem da API', async () => {
  globalThis.fetch = async () => Response.json({ mensagem: 'Estoque insuficiente.' }, { status: 409 });
  await assert.rejects(api.confirmar(8), (error: unknown) => error instanceof ApiError && error.status === 409 && error.message === 'Estoque insuficiente.');
});
test('reposição não é repetida automaticamente após falha de rede', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('offline'); };
  await assert.rejects(api.repor(1, 5), /Atualize os dados antes de repetir/);
  assert.equal(calls, 1);
});
test('consultas paginadas seguem temProxima', async () => {
  const calls: number[] = [];
  const values = await api.all(async (page) => {
    calls.push(page);
    return { conteudo: [page], pagina: page, tamanho: 1, temProxima: page === 0 };
  });
  assert.deepEqual(values, [0, 1]);
  assert.deepEqual(calls, [0, 1]);
});
