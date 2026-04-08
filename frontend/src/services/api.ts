import { CashbackResult, UploadRequest, CardConfig } from "@/types";

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

function getAuthHeaders(): HeadersInit {
  const token = getCookie("chime-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ──────────────────────────────────────────────────

export async function registerUser(username: string, password: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Registration failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function loginUser(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Login failed (HTTP ${res.status})`);
  }
  return res.json();
}

// ── Cards ─────────────────────────────────────────────────

export async function fetchCards(): Promise<CardConfig[]> {
  const res = await fetch("/api/cards");
  if (!res.ok) throw new Error("Failed to fetch cards");
  return res.json();
}

// ── Upload ────────────────────────────────────────────────

export async function uploadStatement(req: UploadRequest): Promise<CashbackResult> {
  const formData = new FormData();
  formData.append("file", req.file);
  formData.append("password", req.password);
  formData.append("cardId", req.cardId);

  const res = await fetch("/api/upload-statement", {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.detail || `Upload failed (HTTP ${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

// ── History ───────────────────────────────────────────────

export interface UploadSummary {
  id: string;
  cardId: string;
  cardName: string;
  cardBank: string;
  cardColor: string;
  cardIcon: string;
  month: string;
  uploadedAt: string;
  totalSpend: number;
  totalCashback: number;
  effectiveRate: number;
  totalTransactions: number;
}

export async function fetchHistory(): Promise<UploadSummary[]> {
  const res = await fetch("/api/history", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchUploadDetail(id: string): Promise<CashbackResult> {
  const res = await fetch(`/api/uploads/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch upload details");
  return res.json();
}

export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete upload");
}
