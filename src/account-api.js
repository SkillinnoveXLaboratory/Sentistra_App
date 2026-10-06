import { authenticatedFetch } from "./api-client";

export async function updateMyAccount({ name, phone }) {
  const response = await authenticatedFetch("/account", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.user) throw new Error(result.error || "Unable to save account changes.");
  return result.user;
}
