"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import slugify from "slugify";
import ThemeToggle from "@/components/ThemeToggle";
import {
  IconHome,
  IconWorldQuestion,
  IconUser,
  IconLogout,
  IconLogin,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";

export default function Header() {
  const { user, hydrated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/", icon: IconHome },
    { label: "Questions", href: "/questions", icon: IconWorldQuestion },
  ];

  if (user) {
    navLinks.push({
      label: "Profile",
      href: `/users/${user.$id}/${slugify(user.name)}`,
      icon: IconUser,
    });
  }

  return (
    <nav className="sticky top-0 z-[5000] border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-xl">🌊</span>
          <span className="hidden sm:inline">RiverFlow</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          {hydrated && user && (
            <Link
              href="/questions/ask"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Ask Question
            </Link>
          )}
          <ThemeToggle />
          {hydrated && user ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconLogout className="h-4 w-4" />
              Logout
            </button>
          ) : hydrated ? (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <IconLogin className="h-4 w-4" />
              Login
            </Link>
          ) : null}
        </div>

        {/* Mobile menu button */}
        <button
          className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconX className="h-5 w-5" /> : <IconMenu2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {hydrated && user && (
              <Link
                href="/questions/ask"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Ask Question
              </Link>
            )}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center gap-2 px-3 py-1">
              <ThemeToggle />
              {hydrated && user ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconLogout className="h-4 w-4" />
                  Logout
                </button>
              ) : hydrated ? (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  <IconLogin className="h-4 w-4" />
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
