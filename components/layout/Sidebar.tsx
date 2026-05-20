"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import LogoutButton from "./LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/products",
    label: "Produtos",
    match: (p) => p === "/products" || p.startsWith("/products/"),
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
        <path d="M3.5 7.5 12 12l8.5-4.5" />
        <path d="M12 12v9" />
      </svg>
    ),
  },
  {
    href: "/products/new",
    label: "Novo produto",
    match: (p) => p === "/products/new",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
  },
];

interface Props {
  email?: string | null;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ email, open, onClose }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 border-r border-border bg-surface flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        aria-label="Navegação principal"
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link
            href="/products"
            className="font-semibold tracking-tight text-base"
          >
            Render<span className="text-primary">AR</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-card text-muted"
            aria-label="Fechar menu"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              data-active={item.match(pathname)}
            >
              <span className="text-muted">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          {email && (
            <div className="px-2 py-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Logado como
              </p>
              <p className="text-xs text-foreground/80 truncate" title={email}>
                {email}
              </p>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
