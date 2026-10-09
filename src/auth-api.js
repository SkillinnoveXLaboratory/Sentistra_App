const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "https://server.skillinnovex.in")
  .replace(/\/+$/, "");

export async function submitAuthRequest(path, payload) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach Sentistra. Check your connection and try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Authentication failed. Please try again.");
  }
  if (!result.user || !result.access_token) {
    throw new Error("The server returned an unexpected response.");
  }
  return { user: result.user, access_token: result.access_token };
}

async function submitPublicRequest(path, payload) {
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach Sentistra. Check your connection and try again.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Request failed. Please try again.");
    error.retryAfter = result.retry_after || 0;
    throw error;
  }
  return result;
}

export function requestSignupOtp(email) {
  return submitPublicRequest("/signup/request-otp", { email });
}

export function verifySignupOtp(email, challengeId, code) {
  return submitPublicRequest("/signup/verify-otp", {
    email,
    challenge_id: challengeId,
    code,
  });
}

export function requestPasswordResetOtp(email) {
  return submitPublicRequest("/password-reset/request-otp", { email });
}

export function verifyPasswordResetOtp(email, challengeId, code) {
  return submitPublicRequest("/password-reset/verify-otp", {
    email,
    challenge_id: challengeId,
    code,
  });
}

export function completePasswordReset(resetToken, password) {
  return submitPublicRequest("/password-reset/complete", {
    reset_token: resetToken,
    password,
  });
}
