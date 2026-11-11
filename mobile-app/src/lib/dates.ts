export const TIME_ZONE = 'America/Sao_Paulo';

export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function monday(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function localInstant(local: string): number {
  return new Date(`${local.slice(0, 19)}-03:00`).getTime();
}

export function formatDay(day: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE, day: 'numeric', month: 'short', ...options,
  }).format(new Date(`${day}T12:00:00Z`)).replace(/\./g, '');
}

export function formatInstant(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(localInstant(value)));
}

export function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false }).format(new Date()));
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export function weekLabel(days: string): string {
  if (days === '1111111') return 'Todos os dias';
  if (days === '1111100') return 'Segunda a sexta';
  return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].filter((_, i) => days[i] === '1').join(' · ');
}
