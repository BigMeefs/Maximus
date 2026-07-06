import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            SE
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Self Employment Caseload Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your advisor account
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
