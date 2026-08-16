import type { Handler } from "@netlify/functions";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { payment_id, amount, notes } = body;

    if (!payment_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing required payment_id" }),
      };
    }

    // If Razorpay keys are available, call Razorpay Refund API
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;

      const payload: Record<string, any> = {
        notes: notes || { reason: "Product return refund" },
      };

      if (amount && amount > 0) {
        // Convert rupees to paise if needed
        payload.amount = Math.round(amount * 100);
      }

      const response = await fetch(`${RAZORPAY_API_BASE}/payments/${payment_id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        console.error("[Razorpay Refund Error]", resData);
        return {
          statusCode: response.status,
          body: JSON.stringify({
            success: false,
            error: resData.error?.description || resData.message || "Failed to process Razorpay refund",
            details: resData,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          refund_id: resData.id,
          amount: (resData.amount || 0) / 100,
          status: resData.status,
          raw: resData,
        }),
      };
    } else {
      // Key fallback for sandbox/COD/testing
      console.warn("[Razorpay Refund] Live keys not present. Generating sandbox refund ID.");
      const mockRefundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          refund_id: mockRefundId,
          amount: amount || 0,
          status: "processed",
          message: "Processed in sandbox/manual mode",
        }),
      };
    }
  } catch (err: any) {
    console.error("[Razorpay Refund System Error]", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || "Internal server error during refund",
      }),
    };
  }
};
