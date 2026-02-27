/**
 * Centralized Twilio SMS utility.
 * Uses Twilio REST API directly (no SDK) — matches existing codebase pattern.
 */

// Normalize phone to E.164 format (+1XXXXXXXXXX for US/CA)
export function formatPhoneE164(phone) {
  if (!phone) return null;
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Already has country code (11+ digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // 10-digit US/CA number — prepend +1
  if (digits.length === 10) return `+1${digits}`;
  // Already in full international format
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
  // Return with + prefix if it looks valid
  if (digits.length >= 10) return `+${digits}`;
  return null; // Too short to be valid
}

export async function sendSms({ to, body, from }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('=== SMS FAILED: Twilio credentials not configured ===', {
      hasSid: !!accountSid,
      hasToken: !!authToken,
      hasFrom: !!fromNumber,
    });
    return { success: false, error: 'Twilio not configured' };
  }

  if (!to) {
    console.error('=== SMS FAILED: No recipient phone number ===');
    return { success: false, error: 'No recipient phone number' };
  }

  // Format phone number to E.164
  const formattedTo = formatPhoneE164(to);
  if (!formattedTo) {
    console.error(`=== SMS FAILED: Invalid phone number "${to}" — could not format to E.164 ===`);
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  const formattedFrom = formatPhoneE164(fromNumber) || fromNumber;

  console.log(`=== SMS SENDING === to=${formattedTo} (raw: ${to}) from=${formattedFrom}`);

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: formattedFrom, To: formattedTo, Body: body }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`=== SMS FAILED === Twilio error ${response.status}:`, JSON.stringify(data));
      return { success: false, error: data.message || 'SMS send failed', code: data.code };
    }

    console.log(`=== SMS SENT === SID=${data.sid} to=${formattedTo} status=${data.status}`);
    return { success: true, sid: data.sid };
  } catch (error) {
    console.error('=== SMS EXCEPTION ===', error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function sendQuoteSms({ clientPhone, clientName, aircraftDisplay, quoteLink, companyName, totalPrice }) {
  const name = clientName || '';
  const aircraft = aircraftDisplay || 'aircraft';
  const price = totalPrice ? ` Total: ${totalPrice}` : '';
  const body = `Hi ${name}, your ${aircraft} quote is ready!${price} View: ${quoteLink} - ${companyName || ''}`;
  return sendSms({ to: clientPhone, body });
}

export async function sendFollowup3DaySms({ clientPhone, clientName, aircraft, link, detailerName }) {
  const body = `Hi ${clientName || ''}, checking in on the quote for your ${aircraft || ''}. ${link} - ${detailerName || ''}`;
  return sendSms({ to: clientPhone, body });
}

export async function sendFollowup7DaySms({ clientPhone, clientName, aircraft, link, detailerName }) {
  const body = `Hi ${clientName || ''}, following up one more time on the ${aircraft || ''} quote. ${link} - ${detailerName || ''}`;
  return sendSms({ to: clientPhone, body });
}

export async function sendExpirationWarningSms({ clientPhone, clientName, aircraft, link }) {
  const body = `Hi ${clientName || ''}, your quote for the ${aircraft || ''} expires tomorrow. ${link}`;
  return sendSms({ to: clientPhone, body });
}

export async function sendExpirationAlertSms({ detailerPhone, clientName, aircraft, statusText }) {
  const body = `\u23F0 Quote for ${clientName || ''}'s ${aircraft || ''} expires in 24hrs. Status: ${statusText}`;
  return sendSms({ to: detailerPhone, body });
}

export async function sendPaymentConfirmationSms({ clientPhone, clientName, aircraftDisplay, amount, companyName }) {
  const body = `Payment of ${amount} confirmed for your ${aircraftDisplay || 'aircraft'} service with ${companyName || ''}. We'll be in touch to schedule. Thank you!`;
  return sendSms({ to: clientPhone, body });
}

export async function sendJobReminderSms({ clientPhone, clientName, aircraftDisplay, companyName, scheduledTime }) {
  const timeStr = scheduledTime ? ` at ${scheduledTime}` : '';
  const body = `Reminder: Your ${aircraftDisplay || 'aircraft'} service with ${companyName || ''} is scheduled for tomorrow${timeStr}. See you then!`;
  return sendSms({ to: clientPhone, body });
}
