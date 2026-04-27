import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "chaopin_share";

export function isShareGateEnabled(): boolean {
  return process.env.CHAOPIN_SHARE_GATE === "1";
}

/** 在开启 CHAOPIN_SHARE_GATE 时，校验当前请求是否持有未撤回的邀请 cookie */
export async function isShareAccessAllowed(): Promise<boolean> {
  if (!isShareGateEnabled()) return true;
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return false;
    const link = await prisma.shareLink.findFirst({
      where: { token, revoked: false },
    });
    if (!link) return false;
    if (link.expiresAt != null && link.expiresAt <= new Date()) return false;
    return true;
  } catch {
    // 数据库未就绪、缺 ShareLink 表等：避免布局抛错导致整页白屏；显示门禁说明页
    return false;
  }
}

export const shareCookieName = COOKIE;
