"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-lg font-semibold text-fg">页面加载出错</h1>
      <p className="text-sm text-fg-soft">
        {error.message || "请查看浏览器控制台与部署日志（Railway / 本地终端）。"}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        重试
      </button>
    </div>
  );
}
