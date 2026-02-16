import Link from "next/link";

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full gap-6 px-4 py-6 md:px-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 flex-col rounded-2xl border border-divider bg-content1 p-4 md:flex">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Studio
            </p>
            <h1 className="mt-2 text-lg font-semibold">Veo 3.1 Studio</h1>
          </div>

          <nav className="space-y-2">
            <Link
              href="/veo"
              className="block rounded-xl border border-divider bg-content2 px-3 py-2 text-sm font-medium"
            >
              Veo Studio
            </Link>
            <span className="block rounded-xl border border-dashed border-divider px-3 py-2 text-sm text-muted-foreground">
              Coming Soon
            </span>
          </nav>

       
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
