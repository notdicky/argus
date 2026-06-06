import { hasTool, runTool } from '../runner';
import type { Severity } from '@argus/core';

export interface VulnFinding {
  name: string;
  severity: Severity;
  templateId: string;
  url: string;
  description: string;
}

const KNOWN_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);

function toSeverity(value: unknown): Severity {
  const normalized = String(value ?? 'info').toLowerCase();
  return (KNOWN_SEVERITIES.has(normalized) ? normalized : 'info') as Severity;
}

export async function runNuclei(urls: string[]): Promise<VulnFinding[]> {
  if (urls.length === 0 || !(await hasTool('nuclei'))) {
    return [];
  }

  try {
    const lines = await runTool('nuclei', ['-silent', '-jsonl', '-duc'], urls.join('\n'));
    const findings: VulnFinding[] = [];

    for (const line of lines) {
      try {
        const json = JSON.parse(line) as Record<string, unknown>;
        const info = (json.info ?? {}) as Record<string, unknown>;
        findings.push({
          name: String(info.name ?? json['template-id'] ?? 'finding'),
          severity: toSeverity(info.severity),
          templateId: String(json['template-id'] ?? ''),
          url: String(json['matched-at'] ?? json.host ?? ''),
          description: String(info.description ?? ''),
        });
      } catch {}
    }

    return findings;
  } catch {
    return [];
  }
}
