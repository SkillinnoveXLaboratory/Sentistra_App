import { authenticatedFetch } from "./api-client";

export async function submitHumanizeRequest(text, model = "Sentistra 0.1") {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 200) {
    throw new Error("Text cannot exceed 200 words.");
  }

  const controller = new AbortController();
  // A queued request can wait behind other safe model jobs before generation begins.
  // Include a small buffer beyond the server's twenty-minute upstream timeout.
  const timeout = setTimeout(() => controller.abort(), 22 * 60 * 1000);

  try {
    const response = await authenticatedFetch("/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, model }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Unable to humanize this text.");
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Humanization timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
