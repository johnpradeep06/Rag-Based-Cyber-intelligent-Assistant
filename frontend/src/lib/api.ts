const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ensure no trailing slash for consistent endpoint concatenation
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

export const API_ENDPOINTS = {
  // Core / Chat
  ask: `${API_BASE_URL}/ask`,
  sessions: `${API_BASE_URL}/sessions`,
  sessionMessages: (sessionId: number | string | null | undefined) => `${API_BASE_URL}/sessions/${sessionId}/messages`,
  sessionAsk: (sessionId: number | string | null | undefined) => `${API_BASE_URL}/sessions/${sessionId}/ask`,
  sessionAskStream: (sessionId: number | string | null | undefined) => `${API_BASE_URL}/sessions/${sessionId}/ask/stream`,

  // Authentication & Users
  login: `${API_BASE_URL}/token`,
  token: `${API_BASE_URL}/token`,
  me: `${API_BASE_URL}/users/me`,
  register: `${API_BASE_URL}/register`,
  registerAdmin: `${API_BASE_URL}/register_admin`,

  // Document Management / Admin
  upload: `${API_BASE_URL}/upload`,
  files: `${API_BASE_URL}/files`,

  // Multi-channel ingestion
  ingestFile: `${API_BASE_URL}/ingest/file`,
  ingestUrl: `${API_BASE_URL}/ingest/url`,
  ingestApi: `${API_BASE_URL}/ingest/api`,
  ingestGithub: `${API_BASE_URL}/ingest/github`,
  ingestFeed: `${API_BASE_URL}/ingest/feed`,
  sources: `${API_BASE_URL}/sources`,
  sourcesGraph: `${API_BASE_URL}/sources/graph`,
  deleteSource: (id: number | string) => `${API_BASE_URL}/sources/${id}`,

  // Admin runtime settings
  adminSettings: `${API_BASE_URL}/admin/settings`,
} as const;

export default API_ENDPOINTS;
