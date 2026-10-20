import "dotenv/config";
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      // Port 465 uses implicit TLS, other ports (587) upgrade with STARTTLS.
      secure: Number(SMTP_PORT ?? 587) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export const VERIFICATION_CODE_TTL_MINUTES = 10;

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  code: string,
) {
  if (!transporter) {
    // Development fallback: no SMTP configured, print the code in the terminal.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }

    console.log(`\n[DEV] Verification code for ${to}: ${code}\n`);
    return;
  }

  const minutes = VERIFICATION_CODE_TTL_MINUTES;

  await transporter.sendMail({
    from: MAIL_FROM ?? SMTP_USER,
    to,
    subject: `Votre code de vérification : ${code}`,
    text: [
      `Bonjour ${firstName},`,
      "",
      `Votre code de vérification Oued Eddahab est : ${code}`,
      `Il est valable ${minutes} minutes.`,
      "",
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
      "",
      `Hello ${firstName}, your Oued Eddahab verification code is ${code} (valid ${minutes} minutes).`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;color:#18181b">
        <h2 style="margin:0 0 12px">Oued Eddahab</h2>
        <p>Bonjour ${escapeHtml(firstName)},</p>
        <p>Votre code de vérification est :</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
        <p>Il est valable ${minutes} minutes.</p>
        <p style="color:#71717a;font-size:13px">
          Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.<br />
          Hello ${escapeHtml(firstName)}, your verification code is ${code} (valid ${minutes} minutes).
        </p>
      </div>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
