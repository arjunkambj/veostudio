"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [{ href: "/veo", label: "Veo Studio" }] as const;

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto box-border flex h-full w-full gap-6 px-4 py-6 md:px-6">
        <aside className="hidden h-full w-64 flex-col rounded-2xl border border-divider bg-content1 p-4 md:flex">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
              Studio
            </p>
            <h1 className="mt-2 text-lg font-semibold">Veo 3.1 Studio</h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border border-primary/30 bg-primary/10 text-primary"
                      : "border border-transparent hover:bg-content3"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="block rounded-xl border border-dashed border-divider px-3 py-2 text-sm text-default-400">
              Coming Soon
            </span>
          </nav>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
