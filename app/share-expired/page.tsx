export default function ShareExpiredPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
      <h1 className="font-display text-xl font-semibold text-fg">链接已失效</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-soft">
        该邀请链接不存在、已停用或已过期。若仍需访问，请向分享者索取新的邀请链接。
      </p>
    </div>
  );
}
