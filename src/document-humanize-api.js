import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiUrl, authenticatedFetch, getAccessToken } from "./api-client";

export async function submitDocumentHumanize(file, model = "Sentistra 0.1") {
  const form = new FormData();
  const uploadFile = new File(Paths.cache, `sentistra-upload-${Date.now()}.docx`);
  await file.copy(uploadFile);
  form.append("file", uploadFile);
  form.append("model", model);

  try {
    const response = await authenticatedFetch("/doc-humanize", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Unable to upload this document.");
    return result;
  } finally {
    uploadFile.delete();
  }
}

export async function getDocumentHumanizeStatus(jobId) {
  const response = await authenticatedFetch(`/doc-humanize/status/${encodeURIComponent(jobId)}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to check document progress.");
  return result;
}

export async function cancelDocumentHumanize(jobId) {
  const response = await authenticatedFetch(`/doc-humanize/cancel/${encodeURIComponent(jobId)}`, { method: "POST" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to cancel document processing.");
  return result;
}

export function getDocumentDownloadUrl(jobId) {
  return apiUrl(`/documents/${encodeURIComponent(jobId)}/download`);
}

export async function saveDocumentToDevice(jobId, fileName = "") {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
  const downloadedFile = await File.downloadFileAsync(getDocumentDownloadUrl(jobId), Paths.cache, {
    idempotent: true,
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.");
  }
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  await Sharing.shareAsync(downloadedFile.uri, {
    mimeType: isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    dialogTitle: isPdf ? "Save AI detection report" : "Save humanized document"
  });
}

export async function getStoredDocuments() {
  const response = await authenticatedFetch("/documents", {
    headers: { "Cache-Control": "no-cache" }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to load your documents.");
  return result.documents || [];
}
