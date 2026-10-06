import { File, Paths } from "expo-file-system";
import { authenticatedFetch } from "./api-client";

async function readResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || fallbackMessage);
  return result;
}

export async function detectText(text) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 1000) throw new Error("Text cannot exceed 1,000 words.");
  const response = await authenticatedFetch("/ai-detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return readResponse(response, "Unable to detect AI text.");
}

export async function detectDocument(file) {
  const uploadFile = new File(Paths.cache, `sentistra-ai-detect-${Date.now()}.docx`);
  await file.copy(uploadFile);
  const form = new FormData();
  form.append("file", uploadFile);
  try {
    const response = await authenticatedFetch("/ai-detect-document-report", { method: "POST", body: form });
    return await readResponse(response, "Unable to analyze this document.");
  } finally {
    uploadFile.delete();
  }
}

export async function getDocumentDetectionStatus(jobId) {
  const response = await authenticatedFetch("/ai-detect-document-report/status/" + encodeURIComponent(jobId), {
    headers: { "Cache-Control": "no-cache" },
  });
  return readResponse(response, "Unable to check AI detection progress.");
}

export async function cancelDocumentDetection(jobId) {
  const response = await authenticatedFetch("/ai-detect-document-report/cancel/" + encodeURIComponent(jobId), {
    method: "POST",
  });
  return readResponse(response, "Unable to cancel AI detection.");
}
