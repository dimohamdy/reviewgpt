"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: "📊",
  },
  {
    label: "Apps",
    href: "/apps",
    icon: "📱",
  },
  {
    label: "Chat",
    href: "/chat",
    icon: "💬",
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <span className="text-xl font-bold">ReviewGPT</span>
            </Link>

            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              AI-Powered Review Analytics
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
