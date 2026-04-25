"use client";

import type { ReactNode } from "react";
import type { FigureState } from "./auth-types";

const stateCopy: Record<FigureState, string> = {
  default: "Hey there!",
  email: "Got it, writing that down...",
  password: "Shh, I won't look!",
  loading: "Almost there...",
  success: "Let's go! 🎉",
  error: "Hmm, something needs a quick fix.",
};

type StickFigureSceneProps = {
  state: FigureState;
};

type LayerProps = {
  active: boolean;
  children: ReactNode;
};

function Layer({ active, children }: LayerProps) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function FigureFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
    >
      <defs>
        <linearGradient id="figureGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a3d" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#111118" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect
        x="26"
        y="28"
        width="268"
        height="264"
        rx="28"
        fill="url(#figureGlow)"
        opacity="0.3"
      />
      {children}
    </svg>
  );
}

function SharedBody({
  headX,
  headY,
  bodyTop,
  bodyBottom,
  headTilt = 0,
  face = "smile",
}: {
  headX: number;
  headY: number;
  bodyTop: [number, number];
  bodyBottom: [number, number];
  headTilt?: number;
  face?: "smile" | "peek" | "confused" | "focused";
}) {
  return (
    <g
      stroke="#f7f7fb"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <circle
        cx={headX}
        cy={headY}
        r="24"
        transform={`rotate(${headTilt} ${headX} ${headY})`}
      />
      {face === "smile" ? (
        <path
          d={`M ${headX - 8} ${headY + 4} Q ${headX} ${headY + 10} ${headX + 8} ${headY + 4}`}
        />
      ) : null}
      {face === "peek" ? (
        <>
          <circle
            cx={headX - 8}
            cy={headY - 2}
            r="2.2"
            fill="#f7f7fb"
            stroke="none"
          />
          <circle
            cx={headX + 8}
            cy={headY - 2}
            r="2.2"
            fill="#f7f7fb"
            stroke="none"
          />
          <path
            d={`M ${headX - 6} ${headY + 7} Q ${headX} ${headY + 11} ${headX + 6} ${headY + 7}`}
          />
        </>
      ) : null}
      {face === "focused" ? (
        <>
          <path
            d={`M ${headX - 10} ${headY - 1} L ${headX - 4} ${headY + 1}`}
          />
          <path
            d={`M ${headX + 10} ${headY - 1} L ${headX + 4} ${headY + 1}`}
          />
          <path
            d={`M ${headX - 7} ${headY + 8} Q ${headX} ${headY + 12} ${headX + 7} ${headY + 8}`}
          />
        </>
      ) : null}
      {face === "confused" ? (
        <>
          <path d={`M ${headX - 8} ${headY - 2} L ${headX - 2} ${headY + 1}`} />
          <path d={`M ${headX + 8} ${headY - 2} L ${headX + 2} ${headY + 1}`} />
          <path
            d={`M ${headX - 7} ${headY + 9} Q ${headX} ${headY + 4} ${headX + 7} ${headY + 10}`}
          />
        </>
      ) : null}
      <path
        d={`M ${bodyTop[0]} ${bodyTop[1]} L ${bodyBottom[0]} ${bodyBottom[1]}`}
      />
    </g>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-center font-body text-[15px] font-medium tracking-[0.01em] text-white/82 transition-opacity duration-300 ease-out sm:text-base">
      {children}
    </p>
  );
}

function Confetti({ x, y, delay }: { x: number; y: number; delay: string }) {
  return (
    <circle
      cx={x}
      cy={y}
      r="3"
      fill="#c7d3f6"
      opacity="0.9"
      className="animate-confetti-float"
      style={{ animationDelay: delay }}
    />
  );
}

export function StickFigureScene({ state }: StickFigureSceneProps) {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden border-b border-white/8 bg-[linear-gradient(160deg,#111118_0%,#14141e_52%,#101018_100%)] px-6 py-7 sm:px-8 sm:py-8 lg:border-b-0 lg:border-r lg:border-[#2a2a3d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,106,245,0.11),transparent_32%),radial-gradient(circle_at_75%_78%,rgba(125,182,207,0.08),transparent_28%)]" />
      <div className="absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative flex flex-1 items-center justify-center">
        <div className="relative aspect-square w-full max-w-[320px]">
          <Layer active={state === "default"}>
            <FigureFrame>
              <SharedBody
                headX={160}
                headY={82}
                bodyTop={[160, 106]}
                bodyBottom={[160, 184]}
                face="smile"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M160 126 L126 150" />
                <path d="M160 126 L194 108" />
                <path d="M194 108 L214 94" />
                <path d="M160 184 L130 236" />
                <path d="M160 184 L192 236" />
                <path d="M210 94 Q220 88 228 96" />
                <path d="M222 94 Q230 90 236 98" />
              </g>
            </FigureFrame>
          </Layer>

          <Layer active={state === "email"}>
            <FigureFrame>
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <rect x="114" y="170" width="96" height="44" rx="8" />
                <path d="M120 196 L192 196" opacity="0.65" />
                <path d="M152 170 L152 160" opacity="0.65" />
                <path d="M170 170 L170 160" opacity="0.65" />
                <path d="M138 178 L202 162" opacity="0.55" />
                <path d="M138 182 L202 166" opacity="0.35" />
                <path d="M196 166 L214 158" opacity="0.75" />
                <path d="M194 168 L204 158" opacity="0.75" />
                <path d="M146 218 L126 244" />
                <path d="M180 218 L198 244" />
              </g>
              <SharedBody
                headX={138}
                headY={88}
                bodyTop={[148, 110]}
                bodyBottom={[154, 182]}
                headTilt={-8}
                face="focused"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M154 128 L175 150" />
                <path d="M154 128 L130 148" />
                <path d="M175 150 L198 172" />
                <path d="M130 148 L122 170" />
                <path d="M156 182 L126 230" />
                <path d="M158 182 L180 230" />
                <path d="M214 120 Q224 114 234 122" opacity="0.75" />
              </g>
            </FigureFrame>
          </Layer>

          <Layer active={state === "password"}>
            <FigureFrame>
              <SharedBody
                headX={160}
                headY={84}
                bodyTop={[160, 108]}
                bodyBottom={[160, 186]}
                face="peek"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M132 96 L150 120" />
                <path d="M188 96 L170 120" />
                <path d="M128 100 Q112 110 124 132" opacity="0.65" />
                <path d="M192 100 Q208 110 196 132" opacity="0.65" />
                <path d="M160 124 L136 154" />
                <path d="M160 124 L184 154" />
                <path d="M160 186 L134 236" />
                <path d="M160 186 L186 236" />
                <path d="M116 106 L106 96" opacity="0.7" />
                <path d="M204 106 L214 96" opacity="0.7" />
              </g>
            </FigureFrame>
          </Layer>

          <Layer active={state === "loading"}>
            <FigureFrame>
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M98 142 L122 142" opacity="0.7" />
                <path d="M96 160 L126 160" opacity="0.5" />
                <path d="M116 124 L138 138" opacity="0.6" />
                <path d="M164 88 L186 92" opacity="0.7" />
                <path d="M214 120 L238 132" opacity="0.7" />
              </g>
              <SharedBody
                headX={150}
                headY={82}
                bodyTop={[158, 108]}
                bodyBottom={[170, 186]}
                headTilt={8}
                face="focused"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M150 128 L126 148" />
                <path d="M150 128 L180 146" />
                <path d="M126 148 L118 170" />
                <path d="M180 146 L202 162" />
                <path d="M156 186 L126 230" />
                <path d="M170 186 L190 230" />
                <path d="M190 230 Q214 224 220 204" />
                <path d="M126 230 Q100 234 92 208" />
              </g>
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M206 178 L230 164" opacity="0.85" />
                <path d="M208 194 L234 192" opacity="0.85" />
                <path d="M202 210 L224 224" opacity="0.85" />
              </g>
            </FigureFrame>
          </Layer>

          <Layer active={state === "success"}>
            <FigureFrame>
              <SharedBody
                headX={160}
                headY={78}
                bodyTop={[160, 102]}
                bodyBottom={[160, 180]}
                face="smile"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M160 124 L128 96" />
                <path d="M160 124 L192 96" />
                <path d="M128 96 L118 74" />
                <path d="M192 96 L202 74" />
                <path d="M160 180 L136 226" />
                <path d="M160 180 L186 226" />
                <path d="M134 226 L120 240" opacity="0.75" />
                <path d="M186 226 L200 240" opacity="0.75" />
              </g>
              <g>
                <Confetti x={86} y={94} delay="0ms" />
                <Confetti x={108} y={66} delay="120ms" />
                <Confetti x={212} y={62} delay="220ms" />
                <Confetti x={238} y={102} delay="80ms" />
                <Confetti x={86} y={206} delay="160ms" />
                <Confetti x={236} y={210} delay="260ms" />
              </g>
            </FigureFrame>
          </Layer>

          <Layer active={state === "error"}>
            <FigureFrame>
              <SharedBody
                headX={160}
                headY={82}
                bodyTop={[160, 106]}
                bodyBottom={[160, 186]}
                headTilt={-12}
                face="confused"
              />
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M160 126 L132 150" />
                <path d="M160 126 L180 112" />
                <path d="M180 112 L190 88" />
                <path d="M190 88 L194 114" />
                <path d="M160 126 L184 154" />
                <path d="M160 186 L134 230" />
                <path d="M160 186 L190 230" />
                <path d="M196 84 L210 70" opacity="0.6" />
                <path d="M202 100 L220 96" opacity="0.6" />
                <path d="M198 114 L214 124" opacity="0.6" />
              </g>
              <g
                stroke="#f7f7fb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M224 80 Q236 72 244 82" opacity="0.7" />
                <path d="M224 100 Q236 92 244 104" opacity="0.7" />
              </g>
            </FigureFrame>
          </Layer>
        </div>
      </div>
      <Caption>{stateCopy[state]}</Caption>
    </section>
  );
}
