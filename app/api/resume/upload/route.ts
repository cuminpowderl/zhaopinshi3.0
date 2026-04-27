import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

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

  const ext =
    file instanceof File && file.name.includes(".")
      ? path.extname(file.name).slice(0, 8).toLowerCase() || ".png"
      : ".png";

  const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext) ? ext : ".png";
  const name = `${randomUUID()}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "resumes");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);

  const url = `/uploads/resumes/${name}`;
  return NextResponse.json({ url, mime: (file as File).type || "image/png" });
}
