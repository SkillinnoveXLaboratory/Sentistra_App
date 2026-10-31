import { authenticatedFetch } from "./api-client";

export async function getSubscriptionPlans() {
  const response = await authenticatedFetch("/subscription/plans", { headers: { "Cache-Control": "no-cache" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to load the subscription plans.");
  return result.plans || [];
}

export async function getSubscriptionStatus() {
  const response = await authenticatedFetch("/subscription/status", { headers: { "Cache-Control": "no-cache" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to load billing status.");
  return result;
}
