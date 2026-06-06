import net from 'node:net';

export const DEFAULT_PORTS = [
  21, 22, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 1433, 3306, 3389, 5432, 6379, 8000, 8080,
  8443, 9200,
];

export function checkPort(host: string, port: number, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export async function scanPorts(host: string, ports = DEFAULT_PORTS): Promise<number[]> {
  const results = await Promise.all(
    ports.map(async (port) => ((await checkPort(host, port)) ? port : null)),
  );
  return results.filter((port): port is number => port !== null);
}
