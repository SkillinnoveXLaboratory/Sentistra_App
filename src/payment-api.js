import { CFPaymentGatewayService } from "react-native-cashfree-pg-sdk";
import { CFEnvironment, CFSession } from "cashfree-pg-api-contract";
import { authenticatedFetch } from "./api-client";

async function paymentRequest(path, options = {}) {
  const response = await authenticatedFetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Payment request failed.");
  return result;
}

export async function beginCashfreeUpgrade({ onVerified, onFailure }) {
  const order = await paymentRequest("/payments/cashfree/order", { method: "POST" });
  const environment = order.environment === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  const session = new CFSession(order.payment_session_id, order.order_id, environment);

  CFPaymentGatewayService.setCallback({
    onVerify: async (orderId) => {
      try {
        const result = await paymentRequest("/payments/cashfree/verify/" + encodeURIComponent(orderId), { method: "POST" });
        if (result.paid) onVerified(result);
        else onFailure(result.message || "Payment is not complete yet.");
      } catch (error) {
        onFailure(error.message || "Unable to verify your payment.");
      }
    },
    onError: (error) => {
      onFailure(error?.message || "Payment was cancelled or could not be completed.");
    },
  });

  try {
    CFPaymentGatewayService.doWebPayment(session);
  } catch (error) {
    CFPaymentGatewayService.removeCallback();
    throw new Error(error?.message || "Unable to open secure checkout.");
  }
}

export function clearCashfreeCallback() {
  CFPaymentGatewayService.removeCallback();
}
