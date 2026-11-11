import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, localInstant, monday, today, weekLabel } from '../src/lib/dates';
import { itemPayload, normalizeApiUrl, positiveInteger, type ItemForm } from '../src/lib/validation';

const form = (override: Partial<ItemForm> = {}): ItemForm => ({
  tipo: 'REMEDIO', nome: ' Teste ', dose: ' 1 comprimido ', quantidade: '2', estoque: '10',
  dias: Array(7).fill(true), horarios: ['20:00', '08:00'], ...override,
});

test('dia da rotina segue São Paulo mesmo quando UTC já está no próximo dia', () => {
  assert.equal(today(new Date('2026-11-12T01:30:00Z')), '2026-11-11');
});
test('semana ISO começa na segunda inclusive para domingo e virada de ano', () => {
  assert.equal(monday('2026-11-15'), '2026-11-09');
  assert.equal(monday('2027-01-01'), '2026-12-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
test('instante local converte para UTC sem depender do fuso do navegador', () => {
  assert.equal(localInstant('2026-11-11T08:30:00'), Date.parse('2026-11-11T11:30:00Z'));
});
test('dias da semana usam segunda a domingo', () => {
  assert.equal(weekLabel('1000001'), 'Seg · Dom');
  assert.equal(weekLabel('1111100'), 'Segunda a sexta');
});
test('payload normaliza strings e ordena horários sem perder quantidade', () => {
  const result = itemPayload(form(), false);
  assert.equal(result.nome, 'Teste');
  assert.equal(result.qtdPorDose, 2);
  assert.equal(result.estoqueInicial, 10);
  assert.deepEqual(result.horarios, ['08:00', '20:00']);
});
test('edição nunca envia estoque inicial', () => {
  assert.equal('estoqueInicial' in itemPayload(form(), true), false);
});
test('hábito nunca envia estoque', () => {
  assert.equal('estoqueInicial' in itemPayload(form({ tipo: 'HABITO' }), false), false);
});
test('estoque inicial pode ser zero mas não negativo nem decimal', () => {
  assert.equal(itemPayload(form({ estoque: '0' }), false).estoqueInicial, 0);
  for (const estoque of ['', '-1', '1.5', '100000']) assert.throws(() => itemPayload(form({ estoque }), false));
});
test('quantidade de reposição é inteira e limitada', () => {
  for (const value of ['-1', '0', '1.5', '1e2', '100000', 'abc']) assert.equal(positiveInteger(value, 99999), null);
  assert.equal(positiveInteger('30', 99999), 30);
});
test('agenda exige dias, horários válidos e sem duplicação', () => {
  assert.throws(() => itemPayload(form({ dias: Array(7).fill(false) }), false));
  assert.throws(() => itemPayload(form({ horarios: ['08:00', '08:00'] }), false));
  assert.throws(() => itemPayload(form({ horarios: ['25:00'] }), false));
  assert.throws(() => itemPayload(form({ horarios: [] }), false));
});
test('endereço da API é normalizado e rejeita URLs com credenciais', () => {
  assert.equal(normalizeApiUrl(' http://192.168.1.2:8080/ '), 'http://192.168.1.2:8080/api/v1');
  assert.equal(normalizeApiUrl('https://example.com/api/v1/'), 'https://example.com/api/v1');
  for (const url of ['ftp://example.com', 'http://user:senha@example.com', 'http://example.com/outro', 'invalido']) assert.throws(() => normalizeApiUrl(url));
});

test('conexão usa o computador do Expo sem IP fixo e respeita configuração explícita', async () => {
  const { resolveApiUrl } = await import('../src/lib/connection');
  assert.equal(resolveApiUrl('android', '192.168.2.25:8081'), 'http://192.168.2.25:8080/api/v1');
  assert.equal(resolveApiUrl('android', '10.0.0.8:8081', '  '), 'http://10.0.0.8:8080/api/v1');
  assert.equal(resolveApiUrl('web', '10.0.0.8:8081'), 'http://localhost:8080/api/v1');
  assert.equal(resolveApiUrl('android', null), '');
  assert.equal(resolveApiUrl('android', '10.0.0.8:8081', 'https://api.example.com/api/v1'), 'https://api.example.com/api/v1');
});
