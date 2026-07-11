"use client"
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import React from 'react';
import { OAuthProvider } from "appwrite";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { IconLoader2, IconMail, IconLock, IconArrowLeft } from '@tabler/icons-react';

function LoginPage() {
  const router = useRouter();
  const { login, loginWithOAuth } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      setError("Please fill all the fields");
      return;
    }

    setIsLoading(true);
    setError("");

    const loginResponse = await login(email.toString(), password.toString());
    if (loginResponse.error) {
      setError(loginResponse.error!.message);
    } else {
      router.push("/");
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                name="email"
                id="email"
                className="pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                name="password"
                id="password"
                className="pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => loginWithOAuth(OAuthProvider.Google)}
          >
            <FcGoogle className="h-5 w-5" />
            Google
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => loginWithOAuth(OAuthProvider.Github)}
          >
            <FaGithub className="h-5 w-5" />
            GitHub
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
