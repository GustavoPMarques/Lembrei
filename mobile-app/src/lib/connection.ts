export function resolveApiUrl(platform: string, expoHost?: string | null, configuredUrl?: string): string {
  const configured = configuredUrl?.trim();
  if (configured) return configured;
  if (platform === 'web') return 'http://localhost:8080/api/v1';
  if (!expoHost) return '';
  try {
    const address = new URL(expoHost.includes('://') ? expoHost : `http://${expoHost}`);
    return `http://${address.hostname}:8080/api/v1`;
  } catch {
    return '';
  }
}
