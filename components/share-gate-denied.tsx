import Link from "next/link";

export function ShareGateDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">访问受限</p>
        <h1 className="mt-2 font-display text-xl font-semibold text-fg">需要邀请链接</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-soft">
          当前实例已开启访客门禁。请使用分享者提供的完整邀请链接（以 <code className="rounded bg-surface-2 px-1">/s/</code>{" "}
          开头）在浏览器中打开一次，即可在本机获得访问权限。旧链接被停用后，需改用新链接。
        </p>
        <p className="mt-4 text-xs text-muted">
          部署方在环境变量中设置 <code className="rounded bg-surface-2 px-1">CHAOPIN_SHARE_GATE=1</code>{" "}
          开启门禁；取消或设为 0 则恢复公开访问。
        </p>
        <Link
          href="/share-expired"
          className="mt-6 inline-block text-sm text-brand hover:underline"
        >
          链接打不开？
        </Link>
      </div>
    </div>
  );
}
