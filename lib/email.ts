import nodemailer from "nodemailer";
import { applyNameToMailBody, MAIL_DEFAULTS } from "./agent-mail-templates";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export async function sendCandidateEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const transport = getTransport();
  if (!transport || !from) {
    return { ok: false, skipped: true, error: "未配置 SMTP，已跳过发信" };
  }
  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "发送失败",
    };
  }
}

export const EMAIL_PASS_SUBJECT = MAIL_DEFAULTS.resumePassSubject;
export const EMAIL_PASS_BODY = (name: string) =>
  applyNameToMailBody(MAIL_DEFAULTS.resumePassBody, name);

export const EMAIL_FAIL_SUBJECT = MAIL_DEFAULTS.resumeFailSubject;
export const EMAIL_FAIL_BODY = (name: string) =>
  applyNameToMailBody(MAIL_DEFAULTS.resumeFailBody, name);

export const EMAIL_TALENT_POOL_SUBJECT = MAIL_DEFAULTS.talentPoolSubject;
export const EMAIL_TALENT_POOL_BODY = (name: string) =>
  applyNameToMailBody(MAIL_DEFAULTS.talentPoolBody, name);
