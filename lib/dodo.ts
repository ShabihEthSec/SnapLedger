import DodoPayments from "dodopayments";

const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
const environment = (process.env.DODO_ENV as "test_mode" | "live_mode") || "test_mode";

if (!bearerToken) {
  console.warn("DODO_PAYMENTS_API_KEY is not set. Dodo Payments will not work.");
}

export const dodoClient = new DodoPayments({
  bearerToken,
  environment,
});
