import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export type OcrResult = {
  name?: string;
  email?: string;
  phone?: string;
  education?: string;
  years?: string;
  city?: string;
  expectedSalary?: string;
};

const SYSTEM = `你是招聘 OCR 助手。根据简历图片提取信息，只输出一个 JSON 对象，不要 markdown 代码块。
字段：name,email,phone,education（专科/本科/硕士/博士之一或最接近的）,years（工作年限数字字符串）,city,expectedSalary（如 18-25K）。
无法识别的字段用 null 或省略。`;

function mimeFromUrl(url: string): string {
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  if (url.endsWith(".webp")) return "image/webp";
  if (url.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function parseModelJson(raw: string): OcrResult {
  let t = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/im.exec(t);
  if (fence?.[1]) t = fence[1].trim();
  const brace = t.match(/\{[\s\S]*\}/);
  const jsonStr = brace ? brace[0] : t;
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  return {
    name: typeof parsed.name === "string" ? parsed.name : undefined,
    email: typeof parsed.email === "string" ? parsed.email : undefined,
    phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
    education: typeof parsed.education === "string" ? parsed.education : undefined,
    years:
      parsed.years != null && parsed.years !== ""
        ? String(parsed.years)
        : undefined,
    city: typeof parsed.city === "string" ? parsed.city : undefined,
    expectedSalary:
      typeof parsed.expectedSalary === "string" ? parsed.expectedSalary : undefined,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { imageUrl?: string; mime?: string };
  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl?.startsWith("/uploads/resumes/")) {
    return NextResponse.json({ error: "无效的图片地址" }, { status: 400 });
  }

  const fsPath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  let base64: string;
  const mime =
    typeof body.mime === "string" && body.mime.startsWith("image/")
      ? body.mime
      : mimeFromUrl(imageUrl);
  try {
    const buf = await readFile(fsPath);
    base64 = buf.toString("base64");
  } catch {
    return NextResponse.json({ error: "读取图片失败" }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      partial: {} as OcrResult,
      notice:
        "未配置 OPENAI_API_KEY，无法自动识别。请在项目根目录 .env 中配置后重启 dev，或手动填写。",
    });
  }

  try {
    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
    const apiBase = (process.env.OPENAI_API_BASE ?? "https://api.openai.com").replace(
      /\/$/,
      "",
    );
    const res = await fetch(`${apiBase}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${base64}`,
                  detail: "high",
                },
              },
              { type: "text", text: "请只输出 JSON 对象。" },
            ],
          },
        ],
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: "识别服务异常", detail: t.slice(0, 500) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { error: "模型未返回内容", detail: "choices[0].message.content 为空" },
        { status: 502 },
      );
    }

    let parsed: OcrResult;
    try {
      parsed = parseModelJson(raw);
    } catch (e) {
      return NextResponse.json(
        {
          error: "无法解析模型返回的 JSON",
          detail: raw.slice(0, 400),
          hint: e instanceof Error ? e.message : String(e),
        },
        { status: 422 },
      );
    }

    const hasAny = Object.values(parsed).some((v) => v != null && v !== "");
    return NextResponse.json({
      partial: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        education: parsed.education,
        years: parsed.years,
        city: parsed.city,
        expectedSalary: parsed.expectedSalary,
      },
      notice: hasAny
        ? "已根据图片填充，请核对后保存。"
        : "未从图中解析到有效字段，请检查图片是否清晰或更换模型 OPENAI_VISION_MODEL（如 gpt-4o）。",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "识别失败" },
      { status: 500 },
    );
  }
}
