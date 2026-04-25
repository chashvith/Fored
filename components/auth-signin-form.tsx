"use client";

import type { FormEvent } from "react";
import type { AuthTab } from "./auth-types";

type SignInFormProps = {
  email: string;
  password: string;
  showPassword: boolean;
  busy: boolean;
  errorMessage: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmailFocus: () => void;
  onPasswordFocus: () => void;
  onTogglePassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchTab: (tab: AuthTab) => void;
};

const fieldClassName =
  "w-full rounded-2xl border border-[#2a2a3d] bg-[#1a1a24] px-4 py-3.5 text-[15px] text-white transition-all duration-200 placeholder:text-white/35 focus:scale-[1.01] focus:border-[#7c6af5] focus:outline-none focus:shadow-[0_0_0_3px_rgba(124,106,245,0.18)]";

export function AuthSignInForm({
  email,
  password,
  showPassword,
  busy,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onEmailFocus,
  onPasswordFocus,
  onTogglePassword,
  onSubmit,
  onSwitchTab,
}: SignInFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-white/84"
          htmlFor="signin-email"
        >
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          onFocus={onEmailFocus}
          autoComplete="email"
          className={fieldClassName}
          placeholder="hello@focusread.app"
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-white/84"
          htmlFor="signin-password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onFocus={onPasswordFocus}
            autoComplete="current-password"
            className={`${fieldClassName} pr-14`}
            placeholder="Enter your password"
            disabled={busy}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-sm text-white/72 transition-colors hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={busy}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <a
            href="#"
            className="text-sm text-white/48 transition-colors hover:text-white/72"
          >
            Forgot password?
          </a>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-[#7f4d63] bg-[#25141b] px-4 py-3 text-sm text-[#f5b1c2]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#9d8ff7] bg-[#7c6af5] px-5 py-3 text-sm font-semibold tracking-[0.04em] text-white shadow-[4px_4px_0px_#3d2fa0] transition-transform duration-200 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Signing in..." : "Sign in →"}
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.22em] text-white/32">
          or continue with
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/22 bg-transparent px-5 py-3 text-sm font-medium text-white/86 transition-colors hover:border-white/35 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="text-base">G</span>
        Continue with Google
      </button>

      <p className="pt-1 text-center text-sm text-white/58">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitchTab("create")}
          className="font-medium text-white/84 transition-colors hover:text-white"
        >
          Create one
        </button>
      </p>
    </form>
  );
}
