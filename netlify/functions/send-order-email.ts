import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";

interface OrderItem {
  product_name?: string;
  product_image?: string | null;
  quantity?: number;
  price?: number;
  total?: number;
}

interface OrderEmailData {
  customerEmail?: string;
  customerName?: string;
  orderNumber: string;
  items?: OrderItem[];
  total?: number;
  storeName?: string;
}

const money = (value: number | undefined) =>
  `₹${Number(value ?? 0).toLocaleString()}`;

const buildEmailHtml = (data: OrderEmailData): string => {
  const { customerName, orderNumber, items, total, storeName } = data;
  const year = new Date().getFullYear();
  const name = storeName || process.env.STORE_NAME || "the store";

  const itemsHtml = (items || [])
    .map((item) => {
      const image = item.product_image || "";
      const price = item.price ?? 0;
      const quantity = item.quantity ?? 0;
      const itemTotal = item.total ?? price * quantity;
      return `
        <tr>
          <td style="padding: 12px 8px;">
            ${
              image
                ? `<img src="${image}" alt="${item.product_name || ""}" width="64" height="64" style="border-radius: 8px; object-fit: cover;" />`
                : ""
            }
          </td>
          <td style="padding: 12px 8px; font-family: system-ui, sans-serif; font-size: 14px; color: #111827;">${item.product_name || "Product"}</td>
          <td style="padding: 12px 8px; text-align: center; font-family: system-ui, sans-serif; font-size: 14px; color: #111827;">${quantity}</td>
          <td style="padding: 12px 8px; text-align: right; font-family: system-ui, sans-serif; font-size: 14px; color: #374151;">${money(price)}</td>
          <td style="padding: 12px 8px; text-align: right; font-family: system-ui, sans-serif; font-size: 14px; color: #374151;">${money(itemTotal)}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: system-ui, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="background: #16a34a; padding: 24px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Order Confirmation</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 8px; font-size: 16px; color: #111827;">Hi ${customerName || "there"},</p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #374151;">
          Thank you for your order <strong>#${orderNumber}</strong>. We've received your order and will process it shortly.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <th align="left" style="padding: 12px 8px; font-size: 13px; color: #374151;">Product</th>
              <th align="center" style="padding: 12px 8px; font-size: 13px; color: #374151;">Qty</th>
              <th align="right" style="padding: 12px 8px; font-size: 13px; color: #374151;">Price</th>
              <th align="right" style="padding: 12px 8px; font-size: 13px; color: #374151;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || `<tr><td colspan="4" style="padding: 12px 8px; font-size: 14px; color: #9ca3af;">No items provided</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #e5e7eb;">
              <td colspan="3" style="padding: 12px 8px; font-weight: 600; font-size: 15px; color: #111827;">Total</td>
              <td style="padding: 12px 8px; font-weight: 600; font-size: 15px; color: #111827; text-align: right;">${money(total)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">What happens next?</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
          <li>We'll prepare your order for shipment.</li>
          <li>You'll receive a shipping confirmation with a tracking number once dispatched.</li>
          <li>Questions? Reply to this email or contact our support team.</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        © ${year} ${name}. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const handler: Handler = async (event) => {
  try {
    const orderData = JSON.parse(event.body || "{}") as OrderEmailData;

    const { customerEmail, orderNumber } = orderData;

    if (!customerEmail) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          sent: false,
          message: "No customer email provided; email not sent.",
        }),
      };
    }

    const { data, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order ${orderNumber} Confirmation`,
      html: buildEmailHtml(orderData),
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: emailError.message || "Failed to send order email",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sent: true,
        messageId: data?.id,
      }),
    };
  } catch (error) {
    console.error("send-order-email error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
