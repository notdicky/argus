import tls from 'node:tls';

export interface TlsInfo {
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiry: number | null;
}

export function analyzeTls(host: string, port = 443, timeout = 6000): Promise<TlsInfo | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          resolve(null);
          return;
        }

        const validTo = cert.valid_to ?? null;
        const daysUntilExpiry = validTo
          ? Math.round((new Date(validTo).getTime() - Date.now()) / 86_400_000)
          : null;

        const issuerO = cert.issuer?.O;
        const issuer = Array.isArray(issuerO) ? issuerO.join(', ') : (issuerO ?? null);

        resolve({
          issuer,
          validFrom: cert.valid_from ?? null,
          validTo,
          daysUntilExpiry,
        });
      },
    );

    socket.once('error', () => resolve(null));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}
