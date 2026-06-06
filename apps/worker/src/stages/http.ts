const WEB_PORTS = [80, 443, 8000, 8080, 8443];

export interface HttpResult {
  url: string;
  status: number;
  title: string | null;
  server: string | null;
  headers: Record<string, string>;
}

export function isWebPort(port: number): boolean {
  return WEB_PORTS.includes(port);
}

function buildUrl(host: string, port: number): string {
  const secure = port === 443 || port === 8443;
  const scheme = secure ? 'https' : 'http';
  if (port === 80 || port === 443) {
    return `${scheme}://${host}`;
  }
  return `${scheme}://${host}:${port}`;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match && match[1] ? match[1].trim().slice(0, 200) : null;
}

export async function probeHttp(host: string, port: number): Promise<HttpResult | null> {
  const url = buildUrl(host, port);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { redirect: 'manual', signal: controller.signal });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let title: string | null = null;
    if ((res.headers.get('content-type') ?? '').includes('text/html')) {
      const body = await res.text();
      title = extractTitle(body.slice(0, 20000));
    }

    return { url, status: res.status, title, server: res.headers.get('server'), headers };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
