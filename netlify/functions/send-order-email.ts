import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  try {
    const orderData = JSON.parse(event.body || "{}");

    return {
      statusCode: 200,
      body: JSON.stringify({
        received: orderData,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};