"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { AuthCreateAccountForm } from "./auth-create-account-form";
import { AuthSignInForm } from "./auth-signin-form";
import type { AuthTab } from "./auth-types";

type AuthModalProps = {
  open: boolean;
  initialTab: AuthTab;
  onClose: () => void;
};

type SignInState = {
  email: string;
  password: string;
};

type CreateAccountState = {
  name: string;
  email: string;
  password: string;
  agreed: boolean;
};

type StickState = "default" | "error" | "success";

const emptySignInState: SignInState = {
  email: "",
  password: "",
};

const emptyCreateAccountState: CreateAccountState = {
  name: "",
  email: "",
  password: "",
  agreed: false,
};

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const ratio = Math.max(12, score * 25);

  if (score <= 1) {
    return { ratio, label: "Very light" };
  }

  if (score === 2) {
    return { ratio, label: "Getting warmer" };
  }

  if (score === 3) {
    return { ratio, label: "Pretty solid" };
  }

  return { ratio, label: "Strong" };
}

function validateEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export function AuthModal({ open, initialTab, onClose }: AuthModalProps) {
  const router = useRouter();
  const pullProgress = useMotionValue(0);
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createToastMessage, setCreateToastMessage] = useState<string | null>(
    null,
  );
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [stickState, setStickState] = useState<StickState>("default");
  const [signIn, setSignIn] = useState<SignInState>(emptySignInState);
  const [createAccount, setCreateAccount] = useState<CreateAccountState>(
    emptyCreateAccountState,
  );
  const timersRef = useRef<number[]>([]);
  const successPullRef = useRef<ReturnType<typeof animate> | null>(null);

  // A single shared progress value drives stickman pull, rope tension, and curtain closure.
  const leftCurtainX = useTransform(pullProgress, [0, 1], ["-100%", "0%"]);
  const rightCurtainX = useTransform(pullProgress, [0, 1], ["100%", "0%"]);
  const ropeHeight = useTransform(pullProgress, [0, 0.2, 1], [80, 110, 300]);
  const ropeOpacity = useTransform(
    pullProgress,
    [0, 0.2, 1],
    [0.35, 0.45, 0.32],
  );
  const stickSwingRotate = useTransform(
    pullProgress,
    [0, 0.16, 0.34, 1],
    [0, 8, -5, 0],
  );
  const stickPullY = useTransform(pullProgress, [0, 1], [0, 620]);

  const strength = useMemo(
    () => getPasswordStrength(createAccount.password),
    [createAccount.password],
  );

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const queueTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const stopSuccessPull = () => {
    successPullRef.current?.stop();
    successPullRef.current = null;
    pullProgress.set(0);
  };

  const resetState = () => {
    clearTimers();
    stopSuccessPull();
    setTab(initialTab);
    setBusy(false);
    setErrorMessage(null);
    setCreateToastMessage(null);
    setShowSignInPassword(false);
    setShowCreatePassword(false);
    setStickState("default");
    setSignIn(emptySignInState);
    setCreateAccount(emptyCreateAccountState);
  };

  useEffect(() => {
    if (!open) {
      clearTimers();
      return;
    }

    resetState();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimers();
      stopSuccessPull();
    };
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const switchTab = (nextTab: AuthTab) => {
    if (busy) {
      return;
    }

    setTab(nextTab);
    setErrorMessage(null);
    setCreateToastMessage(null);
    setStickState("default");
  };

  const closeModal = () => {
    if (busy) {
      return;
    }

    onClose();
  };

  const triggerValidationError = (message: string, target: AuthTab) => {
    if (target === "signin") {
      setErrorMessage(message);
      setCreateToastMessage(null);
    } else {
      setErrorMessage(null);
      setCreateToastMessage(message);
    }

    setStickState("error");
    clearTimers();
    queueTimer(() => {
      setStickState("default");
    }, 1000);

    if (target === "create") {
      queueTimer(() => {
        setCreateToastMessage(null);
      }, 3500);
    }
  };

  const dismissCreateToast = () => {
    setCreateToastMessage(null);
  };

  const setStickStateFromEmail = (email: string) => {
    if (stickState === "success") {
      return;
    }

    if (email.trim().length > 0 && !validateEmail(email)) {
      setStickState("error");
      return;
    }

    setStickState("default");
  };

  const triggerSuccessTransition = () => {
    setBusy(true);
    setErrorMessage(null);
    setCreateToastMessage(null);
    setStickState("success");
    clearTimers();
    stopSuccessPull();

    successPullRef.current = animate(pullProgress, 1, {
      duration: 2.35,
      ease: [0.25, 0.8, 0.25, 1],
      onComplete: () => {
        router.push("/dashboard");
        onClose();
      },
    });
  };

  const submitSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!validateEmail(signIn.email) || !signIn.password.trim()) {
      triggerValidationError(
        "Check your email and password, then try again.",
        "signin",
      );
      return;
    }

    triggerSuccessTransition();
  };

  const submitCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (
      !createAccount.name.trim() ||
      !validateEmail(createAccount.email) ||
      createAccount.password.length < 8 ||
      !createAccount.agreed
    ) {
      triggerValidationError(
        "Add your details, choose a stronger password, and accept the terms.",
        "create",
      );
      return;
    }

    triggerSuccessTransition();
  };

  const stickImageSrc =
    stickState === "error"
      ? "/images/stickman_sad.png"
      : stickState === "success"
        ? "/images/stickman_jumping.png"
        : "/images/stickman_waving.png";

  const stickAnimateProps =
    stickState === "error"
      ? {
          x: [0, -10, 10, -8, 8, 0],
          rotate: 0,
          y: 0,
          opacity: 1,
          filter: "brightness(1.2) blur(0px)",
        }
      : stickState === "success"
        ? undefined
        : {
            rotate: [-2, 2, -2],
            x: 0,
            y: 0,
            opacity: 1,
            filter: "brightness(1.2) blur(0px)",
          };

  const stickTransitionProps =
    stickState === "error"
      ? { duration: 0.4, ease: "easeInOut" as const }
      : stickState === "success"
        ? undefined
        : {
            duration: 2,
            ease: "easeInOut" as const,
            repeat: Infinity,
          };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pb-4 pt-28 backdrop-blur-sm sm:pt-32 md:items-center md:pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
          />

          <AnimatePresence>
            {tab === "create" && createToastMessage ? (
              <motion.div
                className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-end px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <motion.div
                  role="alert"
                  className="pointer-events-auto w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-[#7f4d63] bg-[#25141b] px-4 py-3 text-sm text-[#f5b1c2] shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
                  initial={{ x: 36, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 36, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <div className="flex items-start gap-3">
                    <p className="flex-1 leading-relaxed">
                      {createToastMessage}
                    </p>
                    <button
                      type="button"
                      onClick={dismissCreateToast}
                      aria-label="Dismiss notification"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-[#f5b1c2] transition-colors hover:bg-white/10 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            className="curtain-left pointer-events-none fixed inset-y-0 left-0 z-[9999] w-1/2 bg-[#0a0a0f]"
            style={{ x: leftCurtainX }}
          />
          <motion.div
            className="curtain-right pointer-events-none fixed inset-y-0 right-0 z-[9999] w-1/2 bg-[#0a0a0f]"
            style={{ x: rightCurtainX }}
          />

          <motion.div
            className="relative z-20 mt-4 w-full max-w-[680px] overflow-visible md:mt-0"
            initial={{ scale: 0.8, rotate: -5, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 5, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ transformOrigin: "center" }}
          >
            <div className="rounded-[24px] border-2 border-[#2a2a3d] bg-[#111118] shadow-[0_32px_100px_rgba(0,0,0,0.56)]">
              <button
                type="button"
                aria-label="Close modal"
                onClick={closeModal}
                className="absolute right-4 top-4 z-[90] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0f0f16]/90 text-lg text-white/82 shadow-[0_8px_20px_rgba(0,0,0,0.38)] transition-colors hover:border-white/30 hover:bg-white/12 hover:text-white"
              >
                ×
              </button>

              <section className="relative bg-[#0f0f16] px-5 py-5 text-white sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute right-8 top-0 z-50 flex flex-col items-center sm:right-12">
                  <motion.div
                    className="w-[2px] bg-white/30"
                    style={{
                      height: stickState === "success" ? ropeHeight : 80,
                      opacity: stickState === "success" ? ropeOpacity : 0.35,
                    }}
                  />

                  <motion.img
                    key={stickState}
                    src={stickImageSrc}
                    alt=""
                    aria-hidden="true"
                    className="h-auto w-16 sm:w-28"
                    style={{
                      filter: "brightness(1.2)",
                      transformOrigin: "top center",
                      ...(stickState === "success"
                        ? {
                            rotate: stickSwingRotate,
                            y: stickPullY,
                          }
                        : {}),
                    }}
                    animate={stickAnimateProps}
                    transition={stickTransitionProps}
                  />
                </div>

                <div className="pointer-events-none absolute left-0 top-0 h-28 w-full bg-[radial-gradient(circle_at_20%_0%,rgba(124,106,245,0.22),transparent_54%),radial-gradient(circle_at_80%_0%,rgba(125,182,207,0.16),transparent_44%)]" />

                <div className="relative">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === "signin"}
                      onClick={() => switchTab("signin")}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold tracking-[0.03em] transition-all duration-200 ${
                        tab === "signin"
                          ? "border-[#9d8ff7] bg-[#7c6af5] text-white shadow-[4px_4px_0px_#3d2fa0]"
                          : "border-[#2a2a3d] bg-transparent text-white/70 hover:border-white/22 hover:text-white"
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === "create"}
                      onClick={() => switchTab("create")}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold tracking-[0.03em] transition-all duration-200 ${
                        tab === "create"
                          ? "border-[#9d8ff7] bg-[#7c6af5] text-white shadow-[4px_4px_0px_#3d2fa0]"
                          : "border-[#2a2a3d] bg-transparent text-white/70 hover:border-white/22 hover:text-white"
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  <div className="mb-4 space-y-1">
                    <h2 className="font-display text-[28px] tracking-[-0.02em] text-white sm:text-[32px]">
                      {tab === "signin"
                        ? "Welcome back"
                        : "Create your account"}
                    </h2>
                    <p className="font-body text-sm text-white/62 sm:text-[15px]">
                      {tab === "signin"
                        ? "Sign in to continue your focused reading sessions."
                        : "Start free and bring more intention to every page you read."}
                    </p>
                    {tab === "create" ? (
                      <button
                        type="button"
                        onClick={() => switchTab("signin")}
                        className="inline-flex items-center pt-1 text-sm font-medium text-white/78 transition-colors underline hover:text-white"
                      >
                        Already have an account? Back to sign in
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-[#141420] p-3 sm:p-4">
                    {tab === "signin" ? (
                      <AuthSignInForm
                        email={signIn.email}
                        password={signIn.password}
                        showPassword={showSignInPassword}
                        busy={busy}
                        errorMessage={errorMessage}
                        onEmailChange={(value) => {
                          setSignIn((current) => ({
                            ...current,
                            email: value,
                          }));
                          setStickStateFromEmail(value);
                        }}
                        onPasswordChange={(value) => {
                          setSignIn((current) => ({
                            ...current,
                            password: value,
                          }));
                          setStickStateFromEmail(signIn.email);
                        }}
                        onEmailFocus={() => {
                          setStickStateFromEmail(signIn.email);
                        }}
                        onPasswordFocus={() => {
                          setStickStateFromEmail(signIn.email);
                        }}
                        onTogglePassword={() =>
                          setShowSignInPassword((current) => !current)
                        }
                        onSubmit={submitSignIn}
                        onSwitchTab={switchTab}
                      />
                    ) : (
                      <AuthCreateAccountForm
                        name={createAccount.name}
                        email={createAccount.email}
                        password={createAccount.password}
                        agreed={createAccount.agreed}
                        showPassword={showCreatePassword}
                        busy={busy}
                        strength={strength}
                        onNameChange={(value) => {
                          setCreateAccount((current) => ({
                            ...current,
                            name: value,
                          }));
                          setStickStateFromEmail(createAccount.email);
                        }}
                        onEmailChange={(value) => {
                          setCreateAccount((current) => ({
                            ...current,
                            email: value,
                          }));
                          setStickStateFromEmail(value);
                        }}
                        onPasswordChange={(value) => {
                          setCreateAccount((current) => ({
                            ...current,
                            password: value,
                          }));
                          setStickStateFromEmail(createAccount.email);
                        }}
                        onAgreementChange={(value) => {
                          setCreateAccount((current) => ({
                            ...current,
                            agreed: value,
                          }));
                        }}
                        onNameFocus={() => {
                          setStickStateFromEmail(createAccount.email);
                        }}
                        onEmailFocus={() => {
                          setStickStateFromEmail(createAccount.email);
                        }}
                        onPasswordFocus={() => {
                          setStickStateFromEmail(createAccount.email);
                        }}
                        onTogglePassword={() =>
                          setShowCreatePassword((current) => !current)
                        }
                        onSubmit={submitCreateAccount}
                        onSwitchTab={switchTab}
                      />
                    )}
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
