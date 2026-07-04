export async function sendContractorEmail(input: {
  to: string;
  contractorName: string;
  ticketTitle: string;
  jobUrl: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "Missing RESEND_API_KEY" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "maintenance@example.com",
      to: input.to,
      subject: `Maintenance job: ${input.ticketTitle}`,
      html: `
        <p>Hi ${input.contractorName},</p>
        <p>${input.message}</p>
        <p><a href="${input.jobUrl}">Open job link</a></p>
      `
    })
  });

  if (!response.ok) {
    return { sent: false, reason: await response.text() };
  }

  return { sent: true };
}
