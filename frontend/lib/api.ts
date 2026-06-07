export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

export function api(path: string) {
  if (path.startsWith("/")) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
}
