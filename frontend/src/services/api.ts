import { CashbackResult, UploadRequest, CardConfig, AnalyticsSummary, UserProfile } from "@/types";
import { isTauri } from "./sidecar";

export const API_BASE = import.meta.env.VITE_API_URL || (isTauri ? "http://127.0.0.1:8000" : "");

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

// -- Auth --------------------------------------------------

/**
 * Registers a new user account with credentials and security question recovery data.
 *
 * @param username Unique username
 * @param password Account password
 * @param securityQuestion Selected security question string
 * @param securityAnswer Answer to the security question
 * @returns Token response containing auth token and user profile
 */
export async function registerUser(
  username: string,
  password: string,
  securityQuestion: string,
  securityAnswer: string
) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Registration failed (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Authenticates a user with username and password.
 *
 * @param username Account username
 * @param password Account password
 * @returns Token response containing auth token and user profile
 */
export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
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

/**
 * Retrieves the configured security question for a given username during password recovery.
 *
 * @param username Account username
 * @returns Object with username and security question text
 */
export async function fetchSecurityQuestion(username: string): Promise<{ username: string; security_question: string }> {
  const res = await fetch(`${API_BASE}/api/auth/security-question?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || "No security question found for this user");
  }
  return res.json();
}

/**
 * Resets a user password using their security question answer.
 *
 * @param username Account username
 * @param securityAnswer Answer to security question
 * @param newPassword Desired new password
 * @returns Success message confirmation
 */
export async function resetPassword(
  username: string,
  securityAnswer: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      security_answer: securityAnswer,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Password reset failed (HTTP ${res.status})`);
  }
  return res.json();
}

// -- Profile & Settings ------------------------------------

/**
 * Fetches the currently authenticated user profile information.
 *
 * @returns UserProfile object with username, security question, and creation date
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/auth/profile`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

/**
 * Changes password for the currently logged-in user.
 *
 * @param currentPassword Current account password
 * @param newPassword New account password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || "Failed to change password");
  }
}

/**
 * Updates security question and answer for the currently logged-in user.
 *
 * @param currentPassword Current account password
 * @param securityQuestion New security question string
 * @param securityAnswer Answer to new security question
 */
export async function updateSecurityQuestion(
  currentPassword: string,
  securityQuestion: string,
  securityAnswer: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/update-security-question`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || "Failed to update security question");
  }
}

// -- Cards -------------------------------------------------

/**
 * Fetches the list of active credit card configurations from the backend.
 *
 * @returns Array of CardConfig items
 */
export async function fetchCards(): Promise<CardConfig[]> {
  const res = await fetch(`${API_BASE}/api/cards`);
  if (!res.ok) throw new Error("Failed to fetch cards");
  return res.json();
}

// -- Upload ------------------------------------------------

/**
 * Uploads a bank statement PDF for parsing, classification, and cashback calculation.
 *
 * @param req Upload request containing file, card ID, and optional password
 * @returns Complete CashbackResult containing summary and categorized transactions
 */
export async function uploadStatement(req: UploadRequest): Promise<CashbackResult> {
  const formData = new FormData();
  formData.append("file", req.file);
  formData.append("password", req.password);
  formData.append("cardId", req.cardId);

  const res = await fetch(`${API_BASE}/api/upload-statement`, {
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

// -- History & Analytics -----------------------------------

/**
 * Summary record for an uploaded statement in the user history table.
 */
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
  actualCashbackCredited?: number;
}

/**
 * Retrieves the historical statement uploads list for the current user.
 *
 * @returns Array of UploadSummary records
 */
export async function fetchHistory(): Promise<UploadSummary[]> {
  const res = await fetch(`${API_BASE}/api/history`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

/**
 * Fetches full statement details and transactions for a specific upload ID.
 *
 * @param id Upload unique identifier
 * @returns Full CashbackResult object
 */
export async function fetchUploadDetail(id: string): Promise<CashbackResult> {
  const res = await fetch(`${API_BASE}/api/uploads/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch upload details");
  return res.json();
}

/**
 * Permanently deletes a statement upload and cascades removal to all its transactions.
 *
 * @param id Upload unique identifier
 */
export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/uploads/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete upload");
}

/**
 * Retrieves multi-month aggregated spend and cashback analytics.
 *
 * @returns AnalyticsSummary with monthly trends and category totals
 */
export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/api/analytics/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

/**
 * Updates the actual cashback amount credited on the bank statement for variance tracking.
 *
 * @param uploadId Upload unique identifier
 * @param actualCashbackCredited Amount credited according to the bank statement
 */
export async function updateReconciliation(uploadId: string, actualCashbackCredited: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/reconciliation`, {
    method: "PUT",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ actual_cashback_credited: actualCashbackCredited }),
  });
  if (!res.ok) throw new Error("Failed to update reconciliation cashback");
}

/**
 * Sets or clears a custom cashback rate override on an individual transaction.
 * Automatically synchronizes with the local SQLite database and recalculates statement totals.
 *
 * @param uploadId Upload unique identifier
 * @param txnId Transaction unique identifier
 * @param userOverrideRate Custom rate percentage (e.g. 5.0) or null to reset to card default
 * @returns Updated transaction and statement summary totals
 */
export async function updateTransactionOverride(
  uploadId: string,
  txnId: string,
  userOverrideRate: number | null
): Promise<{
  transaction_id: string;
  user_override_rate: number | null;
  cashback_rate: number;
  cashback_amount: number;
  total_cashback: number;
  effective_rate: number;
}> {
  const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/transactions/${txnId}/override`, {
    method: "PUT",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ user_override_rate: userOverrideRate }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to update transaction override");
  }
  return res.json();
}

export interface TransactionOverrideItem {
  transaction_id: string;
  user_override_rate: number | null;
}

export interface BatchOverrideResult {
  upload_id: string;
  total_spend: number;
  total_cashback: number;
  effective_rate: number;
}

/**
 * Batch saves custom cashback percentage overrides for multiple transactions in a statement.
 *
 * @param uploadId Upload unique identifier
 * @param overrides List of transaction override items
 * @returns Updated statement summary totals
 */
export async function saveBatchOverrides(
  uploadId: string,
  overrides: TransactionOverrideItem[]
): Promise<BatchOverrideResult> {
  const res = await fetch(`${API_BASE}/api/uploads/${uploadId}/overrides`, {
    method: "PUT",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ overrides }),
  });

  if (!res.ok) {
    if (res.status === 404) {
      // Fallback: update transactions individually if running against an older server instance
      let lastResult: any = null;
      for (const item of overrides) {
        lastResult = await updateTransactionOverride(uploadId, item.transaction_id, item.user_override_rate);
      }
      if (lastResult) {
        return {
          upload_id: uploadId,
          total_spend: 0,
          total_cashback: lastResult.total_cashback,
          effective_rate: lastResult.effective_rate,
        };
      }
    }

    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to save custom rate overrides (HTTP ${res.status})`);
  }
  return res.json();
}
