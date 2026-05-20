"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  motion,
  type Variants,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { AuthModal } from "./auth-modal";
import type { AuthTab } from "./auth-types";
import { Sparkles, Headphones, Maximize, BookOpen, Globe2, Clock, Bookmark, BarChart2 } from "lucide-react";

// ------------------------------
// Magnetic Button Component
// ------------------------------
function MagneticButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: mouseXSpring, y: mouseYSpring }}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

// Reusable scroll-reveal wrapper
function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const variants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20, delay },
    },
  };
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------
// Main Landing Page
// ------------------------------
export function LandingPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<AuthTab>("signin");

  // Subtle background parallax only
  const { scrollY } = useScroll();
  const bgY1 = useTransform(scrollY, [0, 800], [0, 200]);
  const bgY2 = useTransform(scrollY, [0, 800], [0, -120]);
  const heroRightY = useTransform(scrollY, [0, 600], [0, -60]);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const openModal = (tab: AuthTab) => {
    setInitialTab(tab);
    setModalOpen(true);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 120, damping: 20 },
    },
  };

  // Staggered Word Reveal
  const headingWords = "Reading that actually sticks".split(" ");
  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 24, rotate: -4 },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 16 },
    },
  };

  const cardStyles =
    "rounded-2xl border-[2px] border-white bg-[var(--app-surface)] text-white shadow-[6px_6px_0px_white]";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--app-bg)] font-body text-[var(--app-text)]">
      {/* Background blobs */}
      <div className="bg-noise pointer-events-none fixed inset-0 opacity-20" />
      <motion.div
        style={{ y: bgY1 }}
        className="pointer-events-none absolute left-[-8rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-purpleDeep/25 blur-3xl animate-glowPulse"
      />
      <motion.div
        style={{ y: bgY2 }}
        className="pointer-events-none absolute right-[8%] top-[14%] h-72 w-72 rounded-full bg-blueSoft/15 blur-3xl animate-floatSlow"
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Navbar ── */}
        <header className="flex items-center justify-between border-b border-white py-4 relative z-10">
          <div>
            <p className="font-display text-[1.45rem] font-semibold leading-none tracking-[0.06em]">FORED</p>
            <p className="mt-1 font-body text-[0.7rem] uppercase tracking-[0.2em] text-[var(--app-muted)]">
              Focused Reading
            </p>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <button
              onClick={() => openModal("signin")}
              className="rounded-full border border-white bg-transparent px-5 py-2 text-sm font-medium transition-colors hover:bg-[var(--app-surface)]"
            >
              Sign in
            </button>
            <MagneticButton
              onClick={() => openModal("create")}
              className="font-body rounded-full border border-[#7c6af5] bg-[#7c6af5] px-5 py-2 text-sm font-semibold tracking-[0.04em] text-white shadow-[3px_3px_0px_white]"
            >
              Get started free <span aria-hidden>→</span>
            </MagneticButton>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative grid min-h-[calc(100vh-80px)] items-center gap-10 py-12 lg:grid-cols-2 lg:gap-8">
          {/* Left */}
          <motion.div
            className="space-y-6 z-10"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="space-y-4">
              <h1 className="max-w-[15ch] font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.03em] flex flex-wrap gap-[0.3em]">
                {headingWords.map((word, i) => (
                  <motion.span key={i} variants={wordVariants} className="inline-block">
                    {word}
                  </motion.span>
                ))}
              </h1>
              <motion.p variants={itemVariants} className="max-w-[480px] text-lg leading-relaxed text-[var(--app-muted)]">
                Built for minds that wander. Designed for focus that lasts. Premium reading enhanced by AI.
              </motion.p>
            </div>

            <motion.div variants={itemVariants}>
              <MagneticButton
                onClick={() => openModal("create")}
                className="inline-flex items-center justify-center rounded-full border-2 border-[#7c6af5] bg-[#7c6af5] px-8 py-3 text-base font-bold tracking-[0.04em] text-white shadow-[4px_4px_0px_white]"
              >
                Start your journey <span aria-hidden className="ml-2">→</span>
              </MagneticButton>
            </motion.div>

            {/* Reading card */}
            <motion.div variants={itemVariants} className="relative w-full max-w-sm sm:max-w-md mt-4">
              <img
                src="/images/stickman_pushing.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 -left-24 lg:-left-28 z-20 hidden w-32 rotate-[1deg] opacity-95 md:block"
              />
              <div className={`${cardStyles} p-5 w-full rotate-[-1.5deg] transition-transform duration-500 hover:scale-[0.97] hover:rotate-[-2deg]`}>
                <span className="inline-flex rotate-[1.5deg] rounded-[50px] bg-[#7c6af5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                  now reading
                </span>
                <div className="mt-4 space-y-0.5">
                  <h2 className="font-display text-2xl leading-tight">Atomic Habits</h2>
                  <p className="text-sm text-[var(--app-muted)]">James Clear</p>
                </div>
                <div className="mt-4">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full w-[68%] bg-[#7c6af5]" />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[var(--app-muted)]">Chapter 6 · 68% done</p>
                </div>
                {/* Plain button — no Magnetic wrapper so navigation works */}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[50px] border-2 border-[#7c6af5] bg-[#7c6af5] px-5 py-2.5 text-sm font-bold tracking-[0.04em] text-white shadow-[3px_3px_0px_white] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(124,106,245,0.5)]"
                >
                  Resume reading <span>→</span>
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Right */}
          <motion.div
            className="relative flex items-center justify-center lg:justify-end w-full"
            style={{ y: heroRightY }}
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.3, duration: 1 }}
          >
            <div className="relative w-full max-w-sm rotate-[1.5deg] transition-transform duration-500 hover:rotate-0 lg:max-w-md z-10">
              <img
                src="/images/stickman_hanging.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -right-16 lg:-right-20 z-30 hidden w-44 opacity-95 md:block"
              />
              <div className={`${cardStyles} !rounded-3xl p-5`}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white border-dashed">
                  <p className="font-display text-sm font-bold tracking-[0.2em]">READING INSIGHTS</p>
                  <Sparkles className="w-5 h-5 text-[#7c6af5]" />
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-white bg-[var(--app-surface-2)] p-3">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Tonight's Focus</p>
                    <p className="text-sm text-[var(--app-muted)]">Read 12 mins to finish chapter 6.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white bg-[var(--app-surface-2)] p-3">
                      <p className="text-xs font-bold text-[var(--app-muted)] uppercase">Streak</p>
                      <p className="text-lg font-bold mt-0.5">4 Days</p>
                    </div>
                    <div className="rounded-xl border border-white bg-[var(--app-surface-2)] p-3">
                      <p className="text-xs font-bold text-[var(--app-muted)] uppercase">Total Read</p>
                      <p className="text-lg font-bold mt-0.5">13h 40m</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#7c6af5] bg-[#7c6af5] text-white p-4 relative overflow-hidden shadow-[4px_4px_0px_rgba(124,106,245,0.4)]">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                      <Sparkles className="w-12 h-12" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] mb-1">Smart insight</p>
                    <p className="text-sm leading-relaxed relative z-10">
                      You tend to lose focus after 7 minutes. You're 3 mins away from beating your average!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Features Bento Grid ── */}
        <section className="py-16 relative z-10">
          <div className="text-center mb-12">
            <ScrollReveal>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Everything you need to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c6af5] to-blueSoft">
                  focus.
                </span>
              </h2>
              <p className="text-[var(--app-muted)] max-w-2xl mx-auto text-lg">
                Cutting-edge AI combined with a distraction-free environment to help you absorb every word.
              </p>
            </ScrollReveal>
          </div>

          {/* Row 1: Large AI card + Distraction-Free */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <ScrollReveal delay={0.05} className="lg:col-span-2">
              <div className="rounded-2xl border-[2px] border-white bg-[var(--app-surface)] text-white p-8 shadow-[6px_6px_0px_white] h-[380px] relative overflow-hidden group transition-shadow duration-300 hover:shadow-[8px_8px_0px_#7c6af5]">
                <div className="relative z-20 max-w-xs">
                  <div className="w-14 h-14 rounded-xl border border-white bg-[#7c6af5] text-white flex items-center justify-center mb-5 shadow-[3px_3px_0px_rgba(124,106,245,0.4)] transition-transform duration-300 group-hover:scale-110">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3">Inline AI Analysis</h3>
                  <p className="text-white/70 leading-relaxed">
                    Highlight any text and instantly get summaries, translations, or explanations powered by Gemini.
                  </p>
                </div>
                {/* Floating mockup */}
                <div className="absolute bottom-[-16px] right-[-16px] w-[280px] sm:w-[320px] h-[200px] rounded-2xl border-[2px] border-white bg-[var(--app-surface)]/80 text-white backdrop-blur-xl shadow-2xl p-5 rotate-[-6deg] transition-all duration-500 group-hover:rotate-[-2deg] group-hover:-translate-y-4 group-hover:-translate-x-3">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#7c6af5] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Gemini Explains</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-2.5 w-3/4 bg-[var(--app-text)]/15 rounded-full" />
                    <div className="h-2.5 w-full bg-[var(--app-text)]/15 rounded-full" />
                    <div className="h-2.5 w-5/6 bg-[var(--app-text)]/15 rounded-full" />
                    <div className="h-2.5 w-2/3 bg-[var(--app-text)]/15 rounded-full" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--app-text)]/10">
                    <span className="text-xs text-[var(--app-text)]/50 font-mono">Generating response...</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <FeatureCard
                icon={<Maximize className="w-8 h-8" />}
                title="Distraction-Free"
                description="Immersive focus modes and custom typographies designed to keep you in a deep reading state."
              />
            </ScrollReveal>
          </div>

          {/* Row 2: Three equal cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal delay={0.1}>
              <FeatureCard
                icon={<Headphones className="w-8 h-8" />}
                title="Audio Synthesis"
                description="Listen to your books on the go with seamless high-quality cloud text-to-speech."
              />
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <FeatureCard
                icon={<Bookmark className="w-8 h-8" />}
                title="Smart Notes"
                description="Highlight passages and save AI-generated notes directly to your reading journal with one tap."
              />
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <FeatureCard
                icon={<BarChart2 className="w-8 h-8" />}
                title="Reading Analytics"
                description="Track your focus streaks, reading speed, and daily habits with beautiful visual dashboards."
              />
            </ScrollReveal>
          </div>
        </section>

        {/* ── Metrics ── */}
        <section className="py-12 mb-16 relative z-10">
          <ScrollReveal>
            <div className="rounded-3xl border-[2px] border-white bg-[var(--app-surface)] text-white p-8 md:p-14 shadow-[8px_8px_0px_white] transition-shadow duration-500 hover:shadow-[12px_12px_0px_#7c6af5]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center divide-y-2 md:divide-y-0 md:divide-x-2 divide-white divide-dashed">
                <MetricItem icon={<BookOpen className="w-10 h-10" />} value="10k+" label="Books Synced" />
                <MetricItem icon={<Globe2 className="w-10 h-10" />} value="2.5M" label="Words Translated" />
                <MetricItem icon={<Clock className="w-10 h-10" />} value="500k" label="Minutes Listened" />
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t-[2px] border-white border-dashed py-8 relative z-10 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="font-display text-xl font-bold tracking-wider">FORED</p>
              <span className="text-sm text-[var(--app-muted)]">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-sm font-bold text-[var(--app-muted)]">
              <a href="#" className="hover:text-[var(--app-text)] transition-colors">Twitter</a>
              <a href="#" className="hover:text-[var(--app-text)] transition-colors">GitHub</a>
              <a href="#" className="hover:text-[var(--app-text)] transition-colors">Terms</a>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal open={modalOpen} initialTab={initialTab} onClose={() => setModalOpen(false)} />
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      className="rounded-2xl border-[2px] border-white bg-[var(--app-surface)] text-white p-8 shadow-[6px_6px_0px_white] cursor-pointer h-full group transition-shadow duration-300 hover:shadow-[8px_8px_0px_#7c6af5]"
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 400, damping: 12 } }}
    >
      <div className="w-14 h-14 rounded-xl border border-white bg-[#7c6af5] text-white flex items-center justify-center mb-6 shadow-[4px_4px_0px_rgba(124,106,245,0.3)] transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-white/70 leading-relaxed text-base">{description}</p>
    </motion.div>
  );
}

function MetricItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-6 md:py-0"
      whileHover={{ scale: 1.08, y: -4, transition: { type: "spring", stiffness: 300 } }}
    >
      <div className="text-[#7c6af5] mb-3">{icon}</div>
      <div className="font-display text-5xl md:text-6xl font-bold mb-1">{value}</div>
      <div className="text-sm font-bold uppercase tracking-widest text-[var(--app-muted)]">{label}</div>
    </motion.div>
  );
}
