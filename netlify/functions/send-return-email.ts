import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";

interface ReturnEmailPayload {
  customerEmail?: string;
  customerName?: string;
  orderNumber: string;
  returnNumber?: string;
  productName?: string;
  returnReason?: string;
  returnStatus: string;
  formattedStatus: string;
  courierName?: string;
  trackingNumber?: string;
  pickupDate?: string;
  adminNote?: string;
  storeName?: string;
}

const buildReturnEmailHtml = (data: ReturnEmailPayload): string => {
  const {
    customerName,
    orderNumber,
    returnNumber,
    productName,
    returnReason,
    formattedStatus,
    courierName,
    trackingNumber,
    pickupDate,
    adminNote,
    storeName,
  } = data;
  const year = new Date().getFullYear();
  const store = storeName || process.env.STORE_NAME || "Azhar's Store";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Return Request Update</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="background: #2563eb; padding: 24px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Return Request Update</h1>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Order #${orderNumber} ${returnNumber ? `| Return ID: ${returnNumber}` : ''}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #1e293b;">Hello ${customerName || "Customer"},</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #334155; line-height: 1.5;">
          There is a new update regarding your return request for order <strong>#${orderNumber}</strong>.
        </p>

        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${returnNumber ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Return ID</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #0f172a; text-align: right; font-weight: 700;">${returnNumber}</td>
            </tr>
            ` : ''}
            ${productName ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Product</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">${productName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Current Status</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #2563eb; text-align: right; font-weight: 700;">${formattedStatus}</td>
            </tr>
            ${returnReason ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Return Reason</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #334155; text-align: right;">${returnReason}</td>
            </tr>
            ` : ''}
            ${courierName ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Courier / Partner</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #334155; text-align: right; font-weight: 600;">${courierName} ${trackingNumber ? `(${trackingNumber})` : ''}</td>
            </tr>
            ` : ''}
            ${pickupDate ? `
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Pickup Date</td>
              <td style="padding-bottom: 8px; font-size: 14px; color: #334155; text-align: right; font-weight: 600;">${pickupDate}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${adminNote ? `
        <div style="border-left: 4px solid #2563eb; background: #eff6ff; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">UPDATE / COURIER NOTE:</p>
          <p style="margin: 0; font-size: 14px; color: #1e3a8a; line-height: 1.4;">“${adminNote}”</p>
        </div>
        ` : ''}

        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
          Log in to your account at any time to view full return tracking under <strong>My Account → My Returns</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center;">
        © ${year} ${store}. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const data = JSON.parse(event.body || "{}") as ReturnEmailPayload;
    const { customerEmail, orderNumber, formattedStatus } = data;

    if (!customerEmail) {
      return {
        statusCode: 200,
        body: JSON.stringify({ sent: false, message: "No customer email provided" }),
      };
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set in environment, skipping actual email send");
      return {
        statusCode: 200,
        body: JSON.stringify({ sent: false, message: "Resend API key not configured" }),
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: resendData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Return Update — Order #${orderNumber} [${formattedStatus}]`,
      html: buildReturnEmailHtml(data),
    });

    if (emailError) {
      console.error("Resend return email error:", emailError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: emailError.message || "Failed to send return email" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, messageId: resendData?.id }),
    };
  } catch (error) {
    console.error("send-return-email error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
