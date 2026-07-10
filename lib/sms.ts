export async function sendSms(input: { to?: string | null; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!input.to || !accountSid || !authToken || !from) {
    return { sent: false, reason: "SMS not configured" };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      To: input.to,
      From: from,
      Body: input.body
    })
  });

  if (!response.ok) {
    return { sent: false, reason: await response.text() };
  }

  return { sent: true };
}
