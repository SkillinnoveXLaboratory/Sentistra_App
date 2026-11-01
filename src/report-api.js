import Constants from "expo-constants";
import { Platform } from "react-native";
import { authenticatedFetch } from "./api-client";

async function readResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || fallbackMessage);
  return result;
}

export async function submitProblemReport({ category, description }) {
  const response = await authenticatedFetch("/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      description,
      // Helps support reproduce the problem on the same build.
      appVersion: Constants.expoConfig?.version || "",
      platform: `${Platform.OS} ${Platform.Version}`,
    }),
  });
  const result = await readResponse(response, "Unable to send your report.");
  return result.report;
}

export async function getMyReports() {
  const response = await authenticatedFetch("/reports", { headers: { "Cache-Control": "no-cache" } });
  const result = await readResponse(response, "Unable to load your reports.");
  return result.reports || [];
}
