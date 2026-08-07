import { GATEWAYS, type PaymentResult } from "./payments.server";

/**
 * Thin Mollie-specific shims kept for the Mollie webhook route.
 * Everything else goes through the provider-agnostic layer in payments.server.
 */
export async function getMolliePayment(id: string): Promise<PaymentResult> {
  return GATEWAYS.mollie.getPayment(id);
}

export function toMollieAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
