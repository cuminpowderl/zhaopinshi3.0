"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <h1 className="text-lg font-semibold">应用出错</h1>
        <p className="mt-2 text-sm opacity-80">{error.message}</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
          onClick={() => reset()}
        >
          重试
        </button>
      </body>
    </html>
  );
}
