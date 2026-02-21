import { CashbackResult, UploadRequest } from "@/types";
import { getMockResult } from "@/mocks/transactions";

/**
 * Upload a card statement and get cashback results.
 * Currently returns mock data – replace the body with a real API call.
 */
export async function uploadStatement(req: UploadRequest): Promise<CashbackResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1500));

  // TODO: Replace with real API call
  // const formData = new FormData();
  // formData.append("file", req.file);
  // formData.append("password", req.password);
  // formData.append("cardId", req.cardId);
  // const res = await fetch("/api/upload", { method: "POST", body: formData });
  // return res.json();

  return getMockResult(req.cardId);
}
