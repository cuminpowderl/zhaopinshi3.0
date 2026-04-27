import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "文件过大（最大 6MB）" }, { status: 400 });
  }

  const original =
    file instanceof File && typeof file.name === "string" && file.name.trim()
      ? file.name.trim()
      : "resume.png";

  const uuid = randomUUID();
  const ext = original.includes(".") ? original.split(".").pop()?.toLowerCase() : undefined;
  const safeExt = ext && ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "png";
  const pathname = `resumes/${uuid}.${safeExt}`;

  try {
    const blob = await put(pathname, buf, {
      access: "public",
      contentType: (file as File).type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url, mime: blob.contentType });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "上传失败：请在 Vercel 项目中配置 Blob（环境变量 BLOB_READ_WRITE_TOKEN），或本地改用传统写盘实现。",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
