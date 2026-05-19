import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function Header({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/spaces" className="font-semibold tracking-tight">
          RenderEstate <span className="text-primary">3D</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-muted hidden sm:inline">{email}</span>}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
