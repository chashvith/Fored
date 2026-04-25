"use client";

import { useState } from "react";
import { AuthModal } from "./auth-modal";
import type { AuthTab } from "./auth-types";

export function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<AuthTab>("signin");

  const openModal = (tab: AuthTab) => {
    setInitialTab(tab);
    setModalOpen(true);
  };

  return (
    <main className="relative h-screen overflow-hidden bg-base font-body text-text">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-35" />

      <div className="pointer-events-none absolute left-[-8rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-purpleDeep/25 blur-3xl animate-glowPulse" />
      <div className="pointer-events-none absolute right-[8%] top-[14%] h-72 w-72 rounded-full bg-blueSoft/15 blur-3xl animate-floatSlow" />
      <div className="pointer-events-none absolute bottom-[-7rem] right-[30%] h-80 w-80 rounded-full bg-indigoSoft/12 blur-3xl" />

      <div className="relative flex h-full flex-col px-4 py-3 sm:px-6 md:px-10">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center">
            <div className="-mt-0.5">
              <p className="font-display text-[1.45rem] font-semibold leading-none tracking-[0.06em] text-white/95">
                FORED
              </p>
              <p className="mt-1 font-body text-[0.7rem] uppercase tracking-[0.2em] text-white/42">
                Focused Reading
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => openModal("signin")}
              className="rounded-full border border-white/18 bg-transparent px-5 py-2 text-sm font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white"
            >
              Sign in
            </button>
            <button
              onClick={() => openModal("create")}
              className="font-body rounded-full border border-[#9d8ff7] bg-[#7c6af5] px-5 py-2 text-sm font-semibold tracking-[0.04em] text-white shadow-[4px_4px_0px_#3d2fa0] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Get started free <span aria-hidden>→</span>
            </button>
          </div>
        </header>

        <section className="relative grid flex-1 items-center gap-5 py-1 lg:grid-cols-[1fr_0.78fr] lg:gap-10">
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-read-gradient opacity-[0.09] blur-3xl lg:block" />

          <div className="space-y-4 pt-3 lg:pt-5">
            <div className="space-y-3">
              <h1 className="max-w-[13ch] bg-gradient-to-b from-white to-[#e8e8f0] bg-clip-text font-display text-[clamp(2.5rem,5.7vw,3.8rem)] leading-[0.95] tracking-[-0.03em] text-transparent lg:text-[60px]">
                Reading that actually sticks
              </h1>
              <p className="max-w-[480px] font-body text-[17px] font-normal leading-[1.58] text-[#8a8a9f]">
                Built for minds that wander. Designed for focus that lasts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => openModal("create")}
                className="inline-flex items-center justify-center rounded-full border border-[#9d8ff7] bg-[#7c6af5] px-5 py-2.5 text-sm font-semibold tracking-[0.04em] text-white shadow-[4px_4px_0px_#3d2fa0] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Get started free <span aria-hidden>→</span>
              </button>
            </div>

            <div className="relative mt-6 w-full max-w-[340px] translate-x-24 overflow-visible sm:max-w-[380px] md:translate-x-16">
              <img
                src="/images/stickman_pushing.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 -left-28 hidden w-36 rotate-[1deg] opacity-95 transition-transform hover:translate-x-1 md:block"
              />

              <div className="w-full rotate-[-1.5deg] rounded-[18px] border-[3px] border-white bg-[#111118] p-4 shadow-[6px_6px_0px_#7c6af5] transition-transform hover:translate-x-1 sm:p-5">
                <span className="inline-flex rotate-[1.5deg] rounded-[50px] bg-[#7c6af5] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                  now reading
                </span>

                <div className="mt-3 space-y-1">
                  <h2 className="font-display text-[22px] leading-tight text-white sm:text-[24px]">
                    Atomic Habits
                  </h2>
                  <p className="font-body text-[13px] text-[#8d8da8]">
                    James Clear
                  </p>
                </div>

                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-[#1e1e2e]">
                    <div className="h-full w-[68%] rounded-full bg-[#7c6af5]" />
                  </div>
                  <p className="mt-2 font-body text-[12px] text-[#9a9ab1]">
                    Chapter 6 · 68% done
                  </p>
                </div>

                <button className="mt-4 inline-flex items-center gap-2 rounded-[50px] border-2 border-[#9d8ff7] bg-[#7c6af5] px-5 py-2.5 font-body text-sm font-semibold tracking-[0.04em] text-white shadow-[4px_4px_0px_#3d2fa0] transition-transform duration-200 hover:-translate-y-0.5">
                  Resume reading
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center overflow-visible lg:justify-end">
            <div className="absolute inset-0 mx-auto h-[19rem] w-[19rem] rounded-full bg-read-gradient opacity-10 blur-3xl" />

            <div className="relative w-full max-w-[15.5rem] rotate-[1.2deg] transition-transform duration-500 hover:rotate-0 sm:max-w-[17.5rem] lg:max-w-[19.5rem] lg:rotate-[1.8deg]">
              <img
                src="/images/stickman_hanging.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 right-2 z-30 hidden w-40 opacity-95 mix-blend-lighten md:block"
              />

              <div className="absolute -left-3 top-6 h-[16.75rem] w-full rounded-[1.8rem] border border-white/10 bg-surface/35 shadow-[0_20px_38px_rgba(0,0,0,0.38)]" />

              <div className="relative rounded-[1.8rem] border border-white/8 bg-[#101019]/95 p-2 shadow-[0_22px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/6 sm:p-2.5">
                <div className="absolute inset-x-5 top-5 h-1.5 rounded-full bg-read-gradient opacity-95 shadow-[0_0_24px_rgba(124,106,245,0.7)]" />
                <div className="relative rounded-[1.35rem] border border-white/6 bg-[#14141d] p-2">
                  <p className="font-display text-xs tracking-[0.24em] text-white/78">
                    READING INSIGHTS
                  </p>

                  <div className="mt-2.5 border-t border-white/8 pt-2">
                    <p className="text-xs font-semibold text-white/90 sm:text-sm">
                      Tonight&apos;s Focus
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-white/60 sm:text-sm sm:leading-6">
                      Read 12 mins to finish this chapter
                    </p>
                  </div>

                  <div className="mt-2.5 border-t border-white/8 pt-2">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white sm:text-base">
                          Atomic Habits
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                          Chapter 6
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-white/85 sm:text-sm">
                        68%
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full w-[68%] rounded-full bg-read-gradient shadow-[0_0_16px_rgba(122,127,197,0.55)]" />
                    </div>
                  </div>

                  <div className="mt-2.5 border-t border-white/8 pt-2 text-xs text-white/66 sm:text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>Avg session</span>
                      <span className="font-semibold text-white/82">
                        7 mins
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>Last session</span>
                      <span className="font-semibold text-white/82">
                        5 mins
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>Reading streak</span>
                      <span className="font-semibold text-white/82">
                        4 days
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>Total time read</span>
                      <span className="font-semibold text-white/82">
                        13h 40m
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 shadow-[0_0_0_1px_rgba(125,182,207,0.08),0_14px_30px_rgba(0,0,0,0.25)]">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Smart insight
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-white/78 sm:text-sm sm:leading-6">
                      You tend to lose focus after 7 minutes. You&apos;re 3
                      minutes away from beating your average..
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AuthModal
        open={modalOpen}
        initialTab={initialTab}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}
