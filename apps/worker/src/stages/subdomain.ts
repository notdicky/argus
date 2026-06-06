import { promises as dns } from 'node:dns';
import { hasTool, runTool } from '../runner';

const COMMON_PREFIXES = ['', 'www', 'mail', 'dev', 'api', 'staging', 'app', 'admin', 'vpn', 'test'];

export interface ResolvedHost {
  host: string;
  addresses: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toLowerCase()))];
}

function fallbackCandidates(domain: string): string[] {
  return COMMON_PREFIXES.map((prefix) => (prefix ? `${prefix}.${domain}` : domain));
}

export async function discoverSubdomains(domain: string): Promise<string[]> {
  if (await hasTool('subfinder')) {
    try {
      const hosts = await runTool('subfinder', ['-silent', '-d', domain]);
      if (hosts.length > 0) {
        return unique(hosts);
      }
    } catch {}
  }
  return unique(fallbackCandidates(domain));
}

export async function resolveHosts(hosts: string[]): Promise<ResolvedHost[]> {
  return Promise.all(
    hosts.map(async (host) => {
      try {
        const addresses = await dns.resolve4(host);
        return { host, addresses };
      } catch {
        return { host, addresses: [] };
      }
    }),
  );
}
