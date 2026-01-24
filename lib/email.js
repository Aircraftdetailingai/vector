import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Vector <notifications@aviationdetailinghub.com>';
const PRODUCTION_URL = 'https://aviationdetailinghub.com';

/**
 * Send payment received notification to detailer
 */
export async function sendPaymentReceivedEmail({ detailerEmail, detailerName, quote }) {
  const { aircraft_model, aircraft_type, total_price, client_name, client_email, client_phone, id } = quote;
  const aircraftDisplay = aircraft_model || aircraft_type || 'Aircraft';
  const amount = formatCurrency(total_price);

  const customerContact = [];
  if (client_email) customerContact.push(`<a href="mailto:${client_email}" style="color: #1e3a5f;">${client_email}</a>`);
  if (client_phone) customerContact.push(`<a href="tel:${client_phone}" style="color: #1e3a5f;">${client_phone}</a>`);
  const customerContactHtml = customerContact.length > 0 ? customerContact.join(' &bull; ') : '';

  const customerContactText = [];
  if (client_email) customerContactText.push(client_email);
  if (client_phone) customerContactText.push(client_phone);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Received!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${detailerName ? ` ${detailerName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your quote has been approved and paid. Please contact the customer to confirm available dates and schedule the service.
    </p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Aircraft:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${aircraftDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${client_name || 'Customer'}</td>
        </tr>
        ${customerContactHtml ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Contact:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${customerContactHtml}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">${amount}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
      The payment has been processed and will be transferred to your connected Stripe account.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${PRODUCTION_URL}/quotes/${id}" style="display: inline-block; background: #1e3a5f; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Quote Details
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">Vector by Aviation Detailing Hub</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi${detailerName ? ` ${detailerName}` : ''},

Great news! Your quote has been approved and paid. Please contact the customer to confirm available dates and schedule the service.

Aircraft: ${aircraftDisplay}
Customer: ${client_name || 'Customer'}${customerContactText.length > 0 ? `\nContact: ${customerContactText.join(' | ')}` : ''}
Amount Paid: ${amount}

The payment has been processed and will be transferred to your connected Stripe account.

View quote details: ${PRODUCTION_URL}/quotes/${id}

--
Vector by Aviation Detailing Hub
  `.trim();

  return sendEmail({
    to: detailerEmail,
    subject: `Payment Received: ${amount} for ${aircraftDisplay}`,
    html,
    text,
  });
}

/**
 * Send payment confirmation to customer
 */
export async function sendPaymentConfirmedEmail({ customerEmail, customerName, quote, detailer }) {
  const { aircraft_model, aircraft_type, total_price, share_link } = quote;
  const aircraftDisplay = aircraft_model || aircraft_type || 'Aircraft';
  const amount = formatCurrency(total_price);
  const detailerName = detailer?.business_name || detailer?.name || 'Your detailer';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Confirmed</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi${customerName ? ` ${customerName}` : ''},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for your payment! Your aircraft detailing service has been confirmed.
    </p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Aircraft:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${aircraftDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Detailer:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${detailerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">${amount}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
      ${detailerName} will contact you shortly to confirm available dates and schedule your service. If you have any questions, please contact them directly.
    </p>

    ${share_link ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${PRODUCTION_URL}/q/${share_link}" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Receipt
      </a>
    </div>
    ` : ''}
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">Powered by Vector</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi${customerName ? ` ${customerName}` : ''},

Thank you for your payment! Your aircraft detailing service has been confirmed.

Aircraft: ${aircraftDisplay}
Detailer: ${detailerName}
Amount Paid: ${amount}

${detailerName} will contact you shortly to confirm available dates and schedule your service. If you have any questions, please contact them directly.

${share_link ? `View your receipt: ${PRODUCTION_URL}/q/${share_link}` : ''}

--
Powered by Vector
  `.trim();

  return sendEmail({
    to: customerEmail,
    subject: `Payment Confirmed: ${aircraftDisplay} Detailing Service`,
    html,
    text,
  });
}

/**
 * Core email sending function
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}
