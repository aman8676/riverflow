"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconUser,
  IconMessages,
  IconHelp,
  IconArrowUp,
} from "@tabler/icons-react";

const items = [
  { label: "Summary", href: "", icon: IconUser },
  { label: "Questions", href: "/questions", icon: IconHelp },
  { label: "Answers", href: "/answers", icon: IconMessages },
  { label: "Votes", href: "/votes", icon: IconArrowUp },
];

const Navbar = () => {
  const { userId, userSlug } = useParams();
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0">
      <nav className="sticky top-28 flex flex-col gap-1.5">
        {items.map(({ label, href, icon: Icon }) => {
          const fullHref = `/users/${userId}/${userSlug}${href}`;
          const isActive = pathname === fullHref;
          return (
            <Link
              key={label}
              href={fullHref}
              className={cn(
                "flex items-center gap-3.5 rounded-xl px-5 py-3 text-sm font-medium tracking-wide transition-all duration-200",
                isActive
                  ? "bg-orange-500/10 text-orange-500 shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Navbar;
