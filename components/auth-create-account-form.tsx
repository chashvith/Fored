"use client";

import type { FormEvent } from "react";
import type { AuthTab } from "./auth-types";

type PasswordStrength = {
  ratio: number;
  label: string;
};

type CreateAccountFormProps = {
  name: string;
  email: string;
  password: string;
  agreed: boolean;
  showPassword: boolean;
  busy: boolean;
  strength: PasswordStrength;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAgreementChange: (value: boolean) => void;
  onNameFocus: () => void;
  onEmailFocus: () => void;
  onPasswordFocus: () => void;
  onTogglePassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchTab: (tab: AuthTab) => void;
};

const fieldClassName =
  "w-full rounded-2xl border border-[#2a2a3d] bg-[#1a1a24] px-4 py-3.5 text-[15px] text-white transition-all duration-200 placeholder:text-white/35 focus:scale-[1.01] focus:border-[#7c6af5] focus:outline-none focus:shadow-[0_0_0_3px_rgba(124,106,245,0.18)]";

const strengthBarStyles = {
  weak: "from-[#f6a5b4] via-[#f3c3a7] to-[#e7d4a8]",
  fair: "from-[#f3c3a7] via-[#d8d4a0] to-[#9d8ff7]",
  good: "from-[#96d2bc] via-[#7db6cf] to-[#7a7fc5]",
  strong: "from-[#7db6cf] via-[#7a7fc5] to-[#5b3db4]",
};

export function AuthCreateAccountForm({
  name,
  email,
  password,
  agreed,
  showPassword,
  busy,
  strength,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onAgreementChange,
  onNameFocus,
  onEmailFocus,
  onPasswordFocus,
  onTogglePassword,
  onSubmit,
  onSwitchTab,
}: CreateAccountFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-white/84"
          htmlFor="create-name"
        >
          Name
        </label>
        <input
          id="create-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onFocus={onNameFocus}
          autoComplete="name"
          className={fieldClassName}
          placeholder="Your name"
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-white/84"
          htmlFor="create-email"
        >
          Email
        </label>
        <input
          id="create-email"
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
          htmlFor="create-password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="create-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onFocus={onPasswordFocus}
            autoComplete="new-password"
            className={`${fieldClassName} pr-14`}
            placeholder="Create a password"
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
        <div className="space-y-2 pt-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                strength.ratio <= 25
                  ? strengthBarStyles.weak
                  : strength.ratio <= 50
                    ? strengthBarStyles.fair
                    : strength.ratio <= 75
                      ? strengthBarStyles.good
                      : strengthBarStyles.strong
              } transition-all duration-300 ease-out`}
              style={{ width: `${Math.max(12, strength.ratio)}%` }}
            />
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">
            {strength.label}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => onAgreementChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/25 bg-[#1a1a24] text-[#7c6af5] focus:ring-[#7c6af5]"
          disabled={busy}
        />
        <span>I agree to Terms &amp; Privacy Policy</span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#9d8ff7] bg-[#7c6af5] px-5 py-3 text-sm font-semibold tracking-[0.04em] text-white shadow-[4px_4px_0px_#3d2fa0] transition-transform duration-200 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Creating account..." : "Create account →"}
      </button>

      <button
        type="button"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/22 bg-transparent px-5 py-3 text-sm font-medium text-white/86 transition-colors hover:border-white/35 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="text-base">G</span>
        Continue with Google
      </button>

      <p className="pt-1 text-center text-sm text-white/58">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitchTab("signin")}
          className="font-medium text-white/84 transition-colors hover:text-white"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
