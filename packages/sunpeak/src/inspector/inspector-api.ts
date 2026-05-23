export function inspectorApiEndpoint(path: string, apiBaseUrl?: string): string {
  if (!apiBaseUrl) return path;
  const base = apiBaseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function readInspectorJson<T>(res: Response, endpoint: string): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    const contentType = res.headers.get('content-type');
    const preview = text.trim().replace(/\s+/g, ' ').slice(0, 120);
    const typeHint = contentType ? ` (${contentType})` : '';
    throw new Error(
      `Expected JSON from ${endpoint} but received a non-JSON response${typeHint}: ${preview}`
    );
  }
}

export function resolveInspectorResourceUrls<T>(simulations: T, apiBaseUrl?: string): T {
  if (!apiBaseUrl || !simulations || typeof simulations !== 'object') return simulations;

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(simulations as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      resolved[key] = value;
      continue;
    }

    const sim = value as Record<string, unknown>;
    resolved[key] = {
      ...sim,
      resourceUrl:
        typeof sim.resourceUrl === 'string' && sim.resourceUrl.startsWith('/')
          ? inspectorApiEndpoint(sim.resourceUrl, apiBaseUrl)
          : sim.resourceUrl,
    };
  }

  return resolved as T;
}
