import { authenticatedFetch } from "./api-client";

export async function getSubscriptionPlan() {
  const response = await authenticatedFetch("/subscription/plan");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to load the subscription plan.");
  return result.plan;
}

export async function getSubscriptionStatus() {
  const response = await authenticatedFetch("/subscription/status");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to load billing status.");
  return result;
}
