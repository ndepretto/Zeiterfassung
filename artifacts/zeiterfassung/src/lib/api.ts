/** Base path for direct API fetch calls (not going through the generated client). */
const API_BASE = "/api";

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
