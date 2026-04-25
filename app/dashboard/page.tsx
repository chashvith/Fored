"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function DashboardPage() {
  const [showCurtain, setShowCurtain] = useState(true);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] px-6 py-10 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(124,106,245,0.2),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(125,182,207,0.16),transparent_30%)]" />

      <section className="relative mx-auto mt-16 max-w-4xl rounded-[26px] border border-white/10 bg-[#12121b]/85 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <p className="font-body text-sm uppercase tracking-[0.22em] text-white/52">
          Dashboard
        </p>
        <h1 className="mt-3 font-display text-[40px] leading-[1.05] tracking-[-0.03em] text-white">
          You made it in.
        </h1>
        <p className="mt-4 max-w-[52ch] font-body text-[16px] leading-relaxed text-white/68">
          Your reading flow is ready. Start a focused session or pick up where
          you left off.
        </p>
      </section>

      <AnimatePresence>
        {showCurtain ? (
          <motion.div
            className="fixed inset-0 z-[9999] bg-[#0a0a0f]"
            initial={{ y: 0 }}
            animate={{ y: "-100%" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onAnimationComplete={() => setShowCurtain(false)}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
