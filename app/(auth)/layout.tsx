export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm card p-6 sm:p-8 space-y-6">
        {children}
      </div>
    </main>
  );
}
