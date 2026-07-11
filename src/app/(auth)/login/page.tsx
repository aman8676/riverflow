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
    <div className="w-full max-w-md p-8 space-y-3 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-white/10 text-slate-200">
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      <h1 className="text-2xl font-bold text-center text-white">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-slate-300">
            Email
          </Label>
          <Input
            type="email"
            name="email"
            id="email"
            className="border-white/10 bg-slate-950 text-white placeholder:text-slate-600 focus-visible:ring-purple-500"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <Input
            type="password"
            name="password"
            id="password"
            className="border-white/10 bg-slate-950 text-white placeholder:text-slate-600 focus-visible:ring-purple-500"
            placeholder="••••••••"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-500">or continue with</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-white/10 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 transition-colors"
          onClick={() => loginWithOAuth(OAuthProvider.Google)}
        >
          <FcGoogle size={22} />
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full border-white/10 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 transition-colors"
          onClick={() => loginWithOAuth(OAuthProvider.Github)}
        >
          <FaGithub size={22} />
          Continue with GitHub
        </Button>
      </form>
      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
          Register
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link href="/" className="text-slate-500 hover:text-slate-300">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
