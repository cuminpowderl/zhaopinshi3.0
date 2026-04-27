/** 运行人可在 rulesJson.emailNotify 中覆盖；正文支持占位符 {{name}} */
export type AgentEmailNotify = {
  resumePassSubject?: string;
  resumePassBody?: string;
  resumeFailSubject?: string;
  resumeFailBody?: string;
  talentPoolSubject?: string;
  talentPoolBody?: string;
};

export const MAIL_DEFAULTS = {
  resumePassSubject: "【朝聘】简历初筛已通过",
  resumePassBody: `{{name}} 您好，

您的简历已通过初筛，请注意接听 HR 来电。

—— 朝聘（自动通知）`,
  resumeFailSubject: "【朝聘】简历初筛结果",
  resumeFailBody: `{{name}} 您好，

感谢投递。经评估，本次与岗位匹配度不足，未能进入下一环节。遗憾未能同行，祝您早日找到合适机会。

—— 朝聘（自动通知）`,
  talentPoolSubject: "【朝聘】测评结果通知",
  talentPoolBody: `{{name}} 您好，

感谢参与测评。本次测评结果未达岗位当前要求，已将您的资料纳入我司人才库，后续有合适机会可能会与您联系。

—— 朝聘（自动通知）`,
} as const;

export function applyNameToMailBody(template: string, name: string): string {
  return template.replace(/\{\{name\}\}/g, name);
}

export function parseEmailNotify(raw: unknown): AgentEmailNotify | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
  const out: AgentEmailNotify = {
    resumePassSubject: str("resumePassSubject"),
    resumePassBody: str("resumePassBody"),
    resumeFailSubject: str("resumeFailSubject"),
    resumeFailBody: str("resumeFailBody"),
    talentPoolSubject: str("talentPoolSubject"),
    talentPoolBody: str("talentPoolBody"),
  };
  const has = Object.values(out).some((v) => v != null && v !== "");
  return has ? out : undefined;
}

/** 用于日志一行：已发 / 跳过 / 失败 */
export function formatMailLogLine(
  mail: { ok: boolean; skipped?: boolean; error?: string },
  to: string,
): string {
  if (mail.skipped) return `邮件：未发（未配置 SMTP）→ ${to}`;
  if (mail.ok) return `邮件：已发送 → ${to}`;
  return `邮件：发送失败 → ${to}（${mail.error ?? "未知错误"}）`;
}
