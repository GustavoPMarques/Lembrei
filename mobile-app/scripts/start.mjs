import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const addresses = Object.entries(networkInterfaces())
  .filter(([name]) => !/vpn|radmin|virtual|vethernet|docker|wsl/i.test(name))
  .flatMap(([, values]) => values || [])
  .filter((net) => net.family === 'IPv4' && !net.internal)
  .map((net) => net.address);
const host = addresses.find((ip) => ip.startsWith('192.168.'))
  || addresses.find((ip) => ip.startsWith('10.'))
  || addresses.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip));
const env = { ...process.env };
if (host && !env.REACT_NATIVE_PACKAGER_HOSTNAME) env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--port', '8081', ...process.argv.slice(2)], {
  stdio: 'inherit', env,
});
child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
