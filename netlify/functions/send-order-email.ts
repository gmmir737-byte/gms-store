import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  try {
    const orderData = JSON.parse(event.body || "{}");

    const { customerEmail, customerName, orderNumber, items, total } = orderData;

    const emailResponse = await resend.emails.send({
      from: "GMS Store <onboarding@resend.dev>",
      to: customerEmail,
      subject: `Order Confirmation - ${orderNumber}`,
      html: `
        <h2>Thank you for your order, ${customerName}!</h2>

        <p>Your order number is: <b>${orderNumber}</b></p>

        <h3>Order Details:</h3>

        <ul>
          ${items
            ?.map(
              (item: any) =>
                `<li>${item.name} × ${item.quantity}</li>`
            )
            .join("")}
        </ul>

        <h3>Total: ₹${total}</h3>

        <p>We will update you when your order is shipped.</p>

        <br/>

        <p>GMS Store</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data: emailResponse,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
    };
  }
};