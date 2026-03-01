import { useState, useEffect, useRef, useCallback } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  duration?: number;
}

interface InViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOOKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const handler = () => setY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return y;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANIMATED COUNTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AnimatedCounter({ end, suffix = "", duration = 2000 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN-VIEW WRAPPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InView({ children, className = "", delay = 0, direction = "up" }: InViewProps) {
  const { ref, inView } = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(32px)",
    left: "translateX(-32px)",
    right: "translateX(32px)",
    none: "none",
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : transforms[direction],
        transition: `opacity 0.7s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #06070F;
      --bg2: #0B0D1A;
      --bg3: #10132A;
      --surface: #0F1120;
      --surface2: #151829;
      --border: rgba(255,255,255,0.06);
      --border2: rgba(255,255,255,0.1);
      --purple: #7B5CE5;
      --purple2: #9D7FF0;
      --purple-dim: rgba(123,92,229,0.12);
      --purple-glow: rgba(123,92,229,0.25);
      --gold: #E8A820;
      --gold-dim: rgba(232,168,32,0.12);
      --teal: #0FB8A0;
      --orange: #E05C28;
      --white: #F2F4FF;
      --white2: #C8CCE8;
      --muted: #636888;
      --font-display: 'Syne', sans-serif;
      --font-body: 'DM Sans', sans-serif;
      --font-mono: 'Space Grotesk', monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--white);
      font-family: var(--font-body);
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    ::selection { background: var(--purple-glow); color: var(--white); }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--purple); border-radius: 2px; }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-12px); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes grain {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-2%, -3%); }
      20% { transform: translate(3%, 2%); }
      30% { transform: translate(-1%, 4%); }
      40% { transform: translate(2%, -1%); }
      50% { transform: translate(-3%, 2%); }
      60% { transform: translate(2%, 3%); }
      70% { transform: translate(-2%, -2%); }
      80% { transform: translate(3%, 1%); }
      90% { transform: translate(-1%, 3%); }
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes burst-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(224,92,40,0.4); }
      50% { box-shadow: 0 0 0 12px rgba(224,92,40,0); }
    }

    .gradient-text {
      background: linear-gradient(135deg, var(--purple2) 0%, #C084FC 50%, var(--purple) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .gold-text {
      background: linear-gradient(135deg, var(--gold) 0%, #F5CC6A 50%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .shimmer-text {
      background: linear-gradient(90deg, var(--white2) 0%, var(--white) 30%, var(--purple2) 50%, var(--white) 70%, var(--white2) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }

    .card-hover {
      transition: all 0.35s cubic-bezier(.4,0,.2,1);
      cursor: pointer;
    }
    .card-hover:hover {
      transform: translateY(-6px);
      border-color: rgba(123,92,229,0.35) !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(123,92,229,0.08);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--purple) 0%, #6144CC 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }
    .btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(123,92,229,0.4); }
    .btn-primary:hover::before { opacity: 1; }
    .btn-primary:active { transform: translateY(0); }

    .btn-secondary {
      background: transparent;
      color: var(--white2);
      border: 1px solid var(--border2);
      padding: 14px 28px;
      border-radius: 12px;
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .btn-secondary:hover {
      border-color: rgba(123,92,229,0.5);
      background: rgba(123,92,229,0.08);
      color: var(--white);
      transform: translateY(-2px);
    }

    .noise-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.025;
    }
    .noise-overlay::after {
      content: '';
      position: absolute;
      inset: -50%;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      animation: grain 0.5s steps(1) infinite;
    }

    .section-label {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--purple2);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .section-label::before {
      content: '';
      display: block;
      width: 20px;
      height: 1px;
      background: var(--purple2);
    }

    .glow-line {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--purple-glow), transparent);
    }

    @media (max-width: 768px) {
      .hide-mobile { display: none !important; }
    }
    @media (min-width: 769px) {
      .hide-desktop { display: none !important; }
    }
  `}</style>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ICONS (inline SVG — no deps)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Icon = {
  Logo: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="10" fill="url(#lg)" />
      <path d="M9 10h14M16 10v12M11 22h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B5CE5"/><stop offset="1" stopColor="#4F35B8"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  Arrow: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#E8A820">
      <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.5l-3.7 1.8.7-4.1-3-2.9 4.2-.7L7 1z"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3 3 6-6" stroke="#7B5CE5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Brain: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-3.16A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-3.16A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  ),
  Trophy: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  Zap: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Chart: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Medal: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/>
      <path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/>
      <circle cx="12" cy="17" r="5"/><path d="M12 15v4"/><path d="m10 17 2-2 2 2"/>
    </svg>
  ),
  Globe: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  File: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Flame: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  Users: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Target: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Phone: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Menu: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const NAV_ITEMS = [
  { label: "Courses", hasDropdown: true },
  { label: "Papers", hasDropdown: false },
  { label: "Mental Math", hasDropdown: false },
  { label: "Burst", hasDropdown: false, badge: "NEW" },
];

const COURSES = [
  {
    id: "abacus",
    name: "Study Abacus",
    tag: "Ages 5–15 · 10 Levels",
    tagline: "Mental Visualization Engine",
    desc: "From counting beads to performing complex multi-digit calculations entirely in the mind. Abacus rewires how children think — permanently.",
    color: "#7B5CE5",
    dimColor: "rgba(123,92,229,0.1)",
    glowColor: "rgba(123,92,229,0.2)",
    borderColor: "rgba(123,92,229,0.25)",
    icon: "🧮",
    outcomes: ["Mental calculation speed", "Focus & concentration", "Visual memory", "Math confidence"],
    stat: "10 Levels · 4 Months Each",
  },
  {
    id: "vedic",
    name: "Vedic Maths",
    tag: "Ages 10+ · 4 Levels",
    tagline: "Ancient Speed. Modern Edge.",
    desc: "16 sacred sutras from ancient Indian mathematics. Solve 997 × 998 in under 3 seconds. Competitive exam prep unlike anything in school.",
    color: "#E8A820",
    dimColor: "rgba(232,168,32,0.1)",
    glowColor: "rgba(232,168,32,0.2)",
    borderColor: "rgba(232,168,32,0.25)",
    icon: "🕉",
    outcomes: ["Exam speed tactics", "Complex mental arithmetic", "LCM, GCD, roots", "Competitive edge"],
    stat: "4 Levels · 4 Months Each",
  },
  {
    id: "handwriting",
    name: "Handwriting",
    tag: "All Ages · 3 Months",
    tagline: "Precision. Clarity. Confidence.",
    desc: "English and Hindi tracks. Fine motor control meets cognitive rhythm. Students see measurable improvement within weeks — not years.",
    color: "#0FB8A0",
    dimColor: "rgba(15,184,160,0.1)",
    glowColor: "rgba(15,184,160,0.2)",
    borderColor: "rgba(15,184,160,0.25)",
    icon: "✍️",
    outcomes: ["Legibility & speed", "English & Hindi tracks", "Creative calligraphy", "Exam handwriting"],
    stat: "1 Level · 3 Months",
  },
  {
    id: "stem",
    name: "STEM",
    tag: "Ages 4–18 · 5 Courses",
    tagline: "Engineers Start Here.",
    desc: "From paper circuits at age 4 to drone engineering at 18. Five progressive courses under the Black Monkey umbrella. Hands-on, project-based, real.",
    color: "#E05C28",
    dimColor: "rgba(224,92,40,0.1)",
    glowColor: "rgba(224,92,40,0.2)",
    borderColor: "rgba(224,92,40,0.25)",
    icon: "🤖",
    outcomes: ["Robotics & IoT", "Drone engineering", "AI & Machine learning", "Real-world projects"],
    stat: "5 Courses · 8–12 Weeks Each",
    external: true,
    externalLabel: "Powered by Black Monkey ↗",
  },
];

const TOOLKIT_ITEMS = [
  {
    icon: <Icon.File />,
    title: "Live Paper Attempt",
    desc: "Exam-mode practice with real Abacus and Vedic Maths papers. Timed, scored, and reviewed instantly.",
    color: "#7B5CE5",
    cta: "Attempt Now",
    featured: true,
  },
  {
    icon: <Icon.Brain />,
    title: "Mental Math",
    desc: "Targeted question drills by operation, level, and difficulty. Track accuracy across sessions.",
    color: "#7B5CE5",
    cta: "Practice",
    featured: false,
  },
  {
    icon: <Icon.Zap />,
    title: "Burst Mode",
    desc: "60 seconds. Maximum questions. Compete against yourself and the institute leaderboard.",
    color: "#E05C28",
    cta: "Start Burst",
    featured: false,
    pulse: true,
  },
  {
    icon: <Icon.Chart />,
    title: "Progress Dashboard",
    desc: "Detailed analytics on accuracy, speed, and consistency. See exactly where to improve.",
    color: "#0FB8A0",
    cta: "View Dashboard",
    featured: false,
  },
  {
    icon: <Icon.Trophy />,
    title: "Leaderboard",
    desc: "Institute-wide rankings updated in real time. Compete for the top spot every week.",
    color: "#E8A820",
    cta: "See Rankings",
    featured: false,
  },
  {
    icon: <Icon.Flame />,
    title: "Streaks & Rewards",
    desc: "Daily streaks, badges, and milestone rewards. Consistency becomes its own reward.",
    color: "#7B5CE5",
    cta: "View Badges",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "My daughter completed Level 4 Abacus in 14 months and can now mentally add 5-digit numbers faster than I can on a calculator. The focus improvement is real — her school results show it.",
    name: "Shikha Khandelwal",
    role: "Parent · Rohini Sector 16",
    initials: "SK",
    course: "Abacus",
    stars: 5,
  },
  {
    quote: "Vedic Maths changed how my son prepares for competitive exams. He was struggling with calculation speed in Olympiads — now he finishes sections 20 minutes early. Unbelievable improvement.",
    name: "Rahul Mehta",
    role: "Parent · Gurgaon",
    initials: "RM",
    course: "Vedic Maths",
    stars: 5,
  },
  {
    quote: "We joined Abacus in Class 1. Now in Class 5, my child is the fastest in mental math across the entire school. Ms. Khurana's method is genuinely different from what I've seen elsewhere.",
    name: "Neha Khanna",
    role: "Parent · Rohini Sector 11",
    initials: "NK",
    course: "Abacus",
    stars: 5,
  },
  {
    quote: "The handwriting course transformed my son's presentation in just 10 weeks. His Hindi and English both improved. His class teacher called me to ask what changed.",
    name: "Priya Sharma",
    role: "Parent · New Delhi",
    initials: "PS",
    course: "Handwriting",
    stars: 5,
  },
];

const WHY_ITEMS = [
  {
    icon: <Icon.Brain />,
    label: "COGNITIVE REWIRING",
    title: "Not just math — it's brain training.",
    desc: "Abacus and Vedic Maths don't just teach calculation. They develop the visualization, focus, and working memory that improve performance across all subjects — permanently.",
    color: "#7B5CE5",
    stat: "2× Faster",
    statLabel: "average mental calculation speed after Level 3",
  },
  {
    icon: <Icon.Trophy />,
    label: "PROVEN RESULTS",
    title: "18 years. 900+ students. Medals to prove it.",
    desc: "Every year, our students compete in national and international olympiads — and win. Tablets, cycles, cash prizes, and the confidence that comes from beating your best self.",
    color: "#E8A820",
    stat: "900+",
    statLabel: "students developed across 18 years",
  },
  {
    icon: <Icon.Target />,
    label: "STRUCTURED PROGRESSION",
    title: "Every level earned, not given.",
    desc: "Monthly tests, level completions with certificates and medals, and regular activities that make practice genuinely engaging — not the rote drilling you find elsewhere.",
    color: "#0FB8A0",
    stat: "100%",
    statLabel: "structured curriculum with monthly assessment",
  },
];

const STATS = [
  { value: 18, suffix: "+", label: "Years of Excellence" },
  { value: 900, suffix: "+", label: "Students Developed" },
  { value: 4, suffix: "", label: "Programs Offered" },
  { value: 3, suffix: "", label: "Branches in Delhi NCR" },
];

const MARQUEE_ITEMS = [
  "National Olympiad Winners", "Mental Calculation Champions",
  "18+ Years of Excellence", "900+ Students Shaped",
  "Abacus · Vedic Maths · Handwriting · STEM",
  "Certificates & Medals at Every Level",
  "Monthly Assessments", "Institute Leaderboard",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NAVIGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Nav() {
  const scrollY = useScrollY();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = scrollY > 40;

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        padding: "0 24px",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        background: scrolled ? "rgba(6,7,15,0.88)" : "transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <Icon.Logo />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", lineHeight: 1 }}>Talent Hub</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", color: "var(--muted)", textTransform: "uppercase" }}>Excellence Lab</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <button key={item.label} style={{
                background: "none", border: "none", color: "var(--white2)",
                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                cursor: "pointer", padding: "8px 14px", borderRadius: 8,
                display: "flex", alignItems: "center", gap: 5,
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "white"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--white2)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {item.label}
                {item.badge && (
                  <span style={{ background: "var(--orange)", color: "white", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 4, letterSpacing: "0.06em" }}>{item.badge}</span>
                )}
                {item.hasDropdown && <Icon.ChevronDown />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-secondary" style={{ padding: "9px 18px", fontSize: 14, borderRadius: 10 }}>Sign In</button>
            <button className="btn-primary" style={{ padding: "9px 18px", fontSize: 14, borderRadius: 10 }}>
              Get Started <Icon.Arrow />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="hide-desktop" onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 4 }}>
            <Icon.Menu />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000, background: "var(--bg2)",
          display: "flex", flexDirection: "column", padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon.Logo />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Talent Hub</span>
            </div>
            <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
              <Icon.X />
            </button>
          </div>
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => setMobileOpen(false)} style={{
              background: "none", border: "none", color: "var(--white2)", fontFamily: "var(--font-body)",
              fontSize: 20, fontWeight: 600, cursor: "pointer", padding: "14px 0",
              textAlign: "left", borderBottom: "1px solid var(--border)",
            }}>
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Sign In</button>
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Get Started <Icon.Arrow /></button>
          </div>
        </div>
      )}
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HERO SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(t); }, []);

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 80 }}>
      {/* Background glows */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,92,229,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,92,229,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)",
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        {/* Left content */}
        <div>
          {/* Badge */}
          <div style={{
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)",
            transition: "all 0.6s cubic-bezier(.4,0,.2,1) 0.1s",
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(123,92,229,0.1)", border: "1px solid rgba(123,92,229,0.2)",
            borderRadius: 100, padding: "7px 14px", marginBottom: 28,
          }}>
            <span style={{ color: "var(--purple2)", fontSize: 12 }}><Icon.Sparkle /></span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "var(--purple2)", letterSpacing: "0.04em" }}>
              18+ Years of Excellence
            </span>
            <span style={{ width: 1, height: 12, background: "rgba(123,92,229,0.3)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>Delhi NCR</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 800, lineHeight: 1.0,
            letterSpacing: "-0.03em", marginBottom: 24,
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(24px)",
            transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.2s",
          }}>
            <span style={{ display: "block", fontSize: "clamp(52px, 6vw, 84px)", color: "var(--white)" }}>Crafting</span>
            <span style={{ display: "block", fontSize: "clamp(52px, 6vw, 84px)" }} className="gradient-text">Genius</span>
            <span style={{ display: "block", fontSize: "clamp(52px, 6vw, 84px)", color: "var(--white)" }}>One Beat</span>
            <span style={{ display: "block", fontSize: "clamp(52px, 6vw, 84px)", color: "var(--white)" }}>at a Time.</span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 17, lineHeight: 1.7, color: "var(--white2)", maxWidth: 440, marginBottom: 36,
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.35s",
          }}>
            Strong basics, regular practice, and the kind of confidence that shows up — in class, in exams, and in life. We build thinkers, not test-takers.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap",
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)",
            transition: "all 0.7s cubic-bezier(.4,0,.2,1) 0.45s",
          }}>
            <button className="btn-primary" style={{ fontSize: 15, padding: "13px 26px" }}>
              Start Your Journey <Icon.Arrow />
            </button>
            <button className="btn-secondary" style={{ fontSize: 15, padding: "13px 26px" }}>
              Explore Programs
            </button>
          </div>

          {/* Micro stats */}
          <div style={{
            display: "flex", gap: 32, marginTop: 44,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.7s cubic-bezier(.4,0,.2,1) 0.6s",
            paddingTop: 32, borderTop: "1px solid var(--border)",
          }}>
            {[
              { val: "18+", label: "Years Active" },
              { val: "900+", label: "Students Shaped" },
              { val: "4", label: "Programs" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--white)" }}>{s.val}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right visual */}
        <div style={{
          position: "relative",
          opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(32px)",
          transition: "all 0.9s cubic-bezier(.4,0,.2,1) 0.3s",
        }} className="hide-mobile">
          {/* Main card */}
          <div style={{
            background: "linear-gradient(145deg, var(--surface), var(--bg3))",
            border: "1px solid var(--border2)",
            borderRadius: 28, overflow: "hidden",
            height: 460, position: "relative",
            boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(123,92,229,0.1)",
          }}>
            {/* Gradient overlay simulating photo */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(145deg, #1a1235 0%, #0d0f20 40%, #070a18 100%)",
            }} />

            {/* Decorative abacus illustration */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 100, opacity: 0.06, color: "white", userSelect: "none", letterSpacing: "-0.05em" }}>∑</div>
              {/* Abacus rows */}
              {[5, 7, 6, 8, 5, 7].map((beads, ri) => (
                <div key={ri} style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.15 + ri * 0.05 }}>
                  {Array.from({ length: beads }).map((_, bi) => (
                    <div key={bi} style={{
                      width: 20, height: 14, borderRadius: 7,
                      background: bi < Math.floor(beads / 2) ? "var(--purple2)" : "var(--white2)",
                      opacity: bi < Math.floor(beads / 2) ? 0.8 : 0.3,
                    }} />
                  ))}
                </div>
              ))}
            </div>

            {/* Purple glow */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to top, rgba(123,92,229,0.15), transparent)" }} />

            {/* Stat card overlay */}
            <div style={{
              position: "absolute", bottom: 20, left: 20, right: 20,
              background: "rgba(6,7,15,0.85)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(123,92,229,0.2)", borderRadius: 16,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(123,92,229,0.15)", border: "1px solid rgba(123,92,229,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--purple2)", flexShrink: 0,
              }}>
                <Icon.Trophy />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--white)" }}>900+ Students</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>Guided & developed over 18 years</div>
              </div>
            </div>
          </div>

          {/* Floating badge — top right */}
          <div style={{
            position: "absolute", top: -16, right: -16,
            background: "var(--purple)", borderRadius: 14,
            padding: "10px 16px",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "white",
            boxShadow: "0 8px 32px rgba(123,92,229,0.4)",
            animation: "float 4s ease-in-out infinite",
          }}>
            🏆 Olympiad Winners
          </div>

          {/* Floating card — bottom left */}
          <div style={{
            position: "absolute", bottom: 90, left: -20,
            background: "rgba(6,7,15,0.9)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(232,168,32,0.2)", borderRadius: 14,
            padding: "12px 16px",
            animation: "float 5s ease-in-out infinite 1s",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Latest Achievement</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "white" }}>National Olympiad 🥇</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        opacity: loaded ? 0.4 : 0, transition: "opacity 1s ease 1.2s",
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>Scroll</div>
        <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, var(--muted), transparent)" }} />
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARQUEE SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg2)", padding: "14px 0", position: "relative" }}>
      <div style={{ display: "flex", animation: "marquee 30s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 24px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--purple)", opacity: 0.6 }}>✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATS BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function StatsBar() {
  return (
    <section style={{ padding: "80px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)" }}>
          {STATS.map((stat, i) => (
            <InView key={i} delay={i * 0.1}>
              <div style={{
                background: "var(--surface)", padding: "36px 32px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
                textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }} className="gradient-text">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{stat.label}</div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROGRAMS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Programs() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg, transparent, rgba(123,92,229,0.3), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ marginBottom: 60 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>What We Teach</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 500 }}>
              Four Pathways to{" "}
              <span className="gradient-text">Sharper Thinking</span>
            </h2>
            <p style={{ color: "var(--white2)", fontSize: 17, lineHeight: 1.7, maxWidth: 520, marginTop: 16 }}>
              Structured, progressive, and built for real cognitive growth — not shortcuts or cramming.
            </p>
          </div>
        </InView>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {COURSES.map((course, i) => (
            <InView key={course.id} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
              <div
                className="card-hover"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === i ? `linear-gradient(135deg, ${course.dimColor.replace("0.1", "0.15")}, var(--surface))` : "var(--surface)",
                  border: `1px solid ${hovered === i ? course.borderColor : "var(--border)"}`,
                  borderRadius: 24, padding: "32px",
                  transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
                  boxShadow: hovered === i ? `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${course.glowColor}` : "none",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Background glow on hover */}
                <div style={{
                  position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%",
                  background: `radial-gradient(circle, ${course.glowColor} 0%, transparent 70%)`,
                  opacity: hovered === i ? 1 : 0, transition: "opacity 0.35s ease",
                  pointerEvents: "none",
                }} />

                {/* External badge */}
                {course.external && (
                  <div style={{
                    position: "absolute", top: 20, right: 20,
                    background: `rgba(224,92,40,0.15)`, border: "1px solid rgba(224,92,40,0.25)",
                    borderRadius: 8, padding: "4px 10px",
                    fontFamily: "var(--font-mono)", fontSize: 10, color: "#E05C28",
                    letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Icon.ExternalLink /> blackmonkey.in
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 16, marginBottom: 20,
                  background: course.dimColor, border: `1px solid ${course.borderColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>
                  {course.icon}
                </div>

                {/* Tag */}
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.12em", color: course.color, textTransform: "uppercase",
                  marginBottom: 8,
                }}>
                  {course.tag}
                </div>

                {/* Title */}
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6, color: "var(--white)" }}>
                  {course.name}
                </h3>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: course.color, marginBottom: 14, opacity: 0.85 }}>
                  {course.tagline}
                </div>

                {/* Description */}
                <p style={{ color: "var(--white2)", fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
                  {course.desc}
                </p>

                {/* Outcomes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 24 }}>
                  {course.outcomes.map((o, oi) => (
                    <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--white2)" }}>
                      <span style={{ color: course.color, flexShrink: 0 }}><Icon.Check /></span>
                      {o}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>
                    {course.stat}
                  </span>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: course.color, fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6, padding: 0,
                    transition: "gap 0.2s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.gap = "10px"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.gap = "6px"}
                  >
                    {course.external ? "Visit blackmonkey.in" : "Learn More"}
                    <Icon.Arrow size={14} />
                  </button>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WHY TALENT HUB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WhySection() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ marginBottom: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 16 }}>Why Choose Us</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 3.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                The Talent Hub{" "}
                <span className="gradient-text">Difference</span>
              </h2>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 320, lineHeight: 1.65 }}>
              18 years of refining our methods — here's what sets our students apart.
            </p>
          </div>
        </InView>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {WHY_ITEMS.map((item, i) => (
            <InView key={i} delay={i * 0.12} direction="up">
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr",
                gap: 40, alignItems: "center",
                padding: "40px 40px",
                background: "var(--surface)", borderRadius: 20,
                border: "1px solid var(--border)",
                marginBottom: 12,
                transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${item.color === "#7B5CE5" ? "123,92,229" : item.color === "#E8A820" ? "232,168,32" : "15,184,160"},0.3)`; (e.currentTarget as HTMLDivElement).style.transform = "translateX(6px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                {/* Icon + Label */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `linear-gradient(135deg, ${item.color}20, ${item.color}10)`,
                    border: `1px solid ${item.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: item.color,
                  }}>
                    {item.icon}
                  </div>
                  <div className="section-label" style={{ color: item.color, fontSize: 10 }}>{item.label}</div>
                </div>

                {/* Content */}
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12, color: "var(--white)" }}>
                    {item.title}
                  </h3>
                  <p style={{ color: "var(--white2)", fontSize: 15, lineHeight: 1.7 }}>{item.desc}</p>
                </div>

                {/* Stat */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 800, letterSpacing: "-0.04em", color: item.color, lineHeight: 1 }}>
                    {item.stat}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em", marginTop: 6, lineHeight: 1.5 }}>
                    {item.statLabel}
                  </div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOLKIT SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Toolkit() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg, transparent, rgba(123,92,229,0.3), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="section-label" style={{ justifyContent: "center", marginBottom: 16 }}>The Platform</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
              Practice That{" "}
              <span className="gradient-text">Actually Works</span>
            </h2>
            <p style={{ color: "var(--white2)", fontSize: 17, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
              Every tool on this platform is engineered to reinforce real learning — not just keep students busy.
            </p>
          </div>
        </InView>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {TOOLKIT_ITEMS.map((item, i) => (
            <InView key={i} delay={i * 0.08}>
              <div style={{
                background: item.featured ? "linear-gradient(145deg, rgba(123,92,229,0.12), rgba(123,92,229,0.04))" : "var(--surface)",
                border: item.featured ? "1px solid rgba(123,92,229,0.3)" : "1px solid var(--border)",
                borderRadius: 20, padding: "28px",
                transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
                cursor: "pointer", position: "relative", overflow: "hidden",
                boxShadow: item.featured ? "0 0 40px rgba(123,92,229,0.08)" : "none",
                gridRow: item.featured ? "span 1" : "auto",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.borderColor = item.featured ? "rgba(123,92,229,0.5)" : "rgba(123,92,229,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = item.featured ? "rgba(123,92,229,0.3)" : "var(--border)"; }}
              >
                {item.featured && (
                  <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(123,92,229,0.2)", border: "1px solid rgba(123,92,229,0.3)", borderRadius: 6, padding: "3px 8px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--purple2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Featured
                  </div>
                )}

                <div style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 18,
                  background: `linear-gradient(135deg, ${item.color}25, ${item.color}10)`,
                  border: `1px solid ${item.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: item.color,
                  animation: item.pulse ? "burst-pulse 2s ease-in-out infinite" : "none",
                }}>
                  {item.icon}
                </div>

                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10, color: "var(--white)" }}>
                  {item.title}
                </h3>
                <p style={{ color: "var(--white2)", fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
                  {item.desc}
                </p>

                <button style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: item.color, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6, padding: 0,
                  transition: "gap 0.2s ease",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.gap = "10px"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.gap = "6px"}
                >
                  {item.cta} <Icon.Arrow size={13} />
                </button>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TESTIMONIALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const COURSE_COLORS: Record<string, string> = {
    "Abacus": "#7B5CE5",
    "Vedic Maths": "#E8A820",
    "Handwriting": "#0FB8A0",
  };

  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="section-label" style={{ justifyContent: "center", marginBottom: 16 }}>Parent Voices</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              What Parents{" "}
              <span className="gradient-text">Actually Say</span>
            </h2>
          </div>
        </InView>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Featured quote */}
          <InView direction="left">
            <div style={{
              background: "linear-gradient(145deg, var(--surface), var(--bg3))",
              border: "1px solid var(--border2)", borderRadius: 24, padding: "40px",
              gridRow: "span 2", display: "flex", flexDirection: "column", justifyContent: "space-between",
              minHeight: 360, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, var(--purple), transparent)` }} />

              <div style={{ fontSize: 72, lineHeight: 1, color: "rgba(123,92,229,0.15)", fontFamily: "Georgia, serif", marginBottom: 8 }}>"</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {Array.from({ length: TESTIMONIALS[active].stars }).map((_, i) => <Icon.Star key={i} />)}
                </div>
                <p style={{
                  fontSize: "clamp(16px, 1.6vw, 18px)", lineHeight: 1.75, color: "var(--white)",
                  fontFamily: "var(--font-body)", fontWeight: 300,
                  transition: "opacity 0.4s ease",
                }}>
                  {TESTIMONIALS[active].quote}
                </p>
              </div>

              <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: `linear-gradient(135deg, ${COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple)"}40, ${COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple)"}20)`,
                  border: `1px solid ${COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple)"}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--white)",
                }}>
                  {TESTIMONIALS[active].initials}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--white)" }}>{TESTIMONIALS[active].name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em", marginTop: 2 }}>{TESTIMONIALS[active].role}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span style={{
                    background: `${COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple)"}20`,
                    border: `1px solid ${COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple)"}30`,
                    borderRadius: 8, padding: "4px 10px",
                    fontFamily: "var(--font-mono)", fontSize: 10, color: COURSE_COLORS[TESTIMONIALS[active].course] || "var(--purple2)",
                    letterSpacing: "0.06em",
                  }}>
                    {TESTIMONIALS[active].course}
                  </span>
                </div>
              </div>

              {/* Dots */}
              <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} style={{
                    width: active === i ? 24 : 6, height: 6, borderRadius: 3,
                    background: active === i ? "var(--purple)" : "var(--surface2)",
                    border: "none", cursor: "pointer", padding: 0,
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
            </div>
          </InView>

          {/* Right column cards */}
          {TESTIMONIALS.filter((_, i) => i !== active).slice(0, 2).map((t, i) => (
            <InView key={i} delay={i * 0.15} direction="right">
              <div
                onClick={() => setActive(TESTIMONIALS.indexOf(t))}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "24px",
                  cursor: "pointer", transition: "all 0.3s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(123,92,229,0.25)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                  {Array.from({ length: t.stars }).map((_, si) => <Icon.Star key={si} />)}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--white2)", marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {t.quote}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `${COURSE_COLORS[t.course] || "var(--purple)"}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "var(--white)",
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CTA BANNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CTABanner() {
  return (
    <section style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <InView>
          <div style={{
            position: "relative", borderRadius: 28, overflow: "hidden",
            background: "linear-gradient(135deg, #2d1a6e 0%, #1a1040 40%, #0d0820 100%)",
            border: "1px solid rgba(123,92,229,0.25)",
            padding: "72px 64px",
            boxShadow: "0 40px 100px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            {/* Glowing orbs */}
            <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,92,229,0.25) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(157,127,240,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Grid */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 100, padding: "6px 16px", marginBottom: 28,
              }}>
                <span style={{ fontSize: 14 }}>🎯</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  One free session. No commitment.
                </span>
              </div>

              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: 20, color: "white" }}>
                Ready to Begin{" "}
                <span className="shimmer-text">the Journey?</span>
              </h2>

              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 40 }}>
                The first step to mathematical mastery begins with a single session. See the Talent Hub difference yourself — before committing to anything.
              </p>

              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={{
                  background: "white", color: "#1a1040",
                  border: "none", padding: "15px 32px", borderRadius: 14,
                  fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
                >
                  Book Free Session <Icon.Arrow />
                </button>
                <button style={{
                  background: "transparent", color: "white",
                  border: "1px solid rgba(255,255,255,0.2)", padding: "15px 28px", borderRadius: 14,
                  fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <Icon.Phone /> Call Us Now
                </button>
              </div>

              {/* Trust signals */}
              <div style={{ marginTop: 36, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                {["No registration fee", "Free trial class", "Flexible batch timings"].map((trust) => (
                  <div key={trust} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                    <Icon.Check /> {trust}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </InView>
      </div>
    </section>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOOTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Footer() {
  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "64px 24px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Icon.Logo />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Talent Hub</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>Excellence Lab</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, maxWidth: 280, marginBottom: 20 }}>
              Transforming how children learn mathematics through proven, structured, and genuinely engaging programs since 2006.
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>18+ Years of Teaching Excellence</div>
          </div>

          {/* Programs */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Programs</div>
            {["Abacus", "Vedic Maths", "Handwriting", "STEM"].map((p) => (
              <div key={p} style={{ marginBottom: 12 }}>
                <a href="#" style={{ fontSize: 14, color: "var(--white2)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "white"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--white2)"}
                >{p}</a>
              </div>
            ))}
          </div>

          {/* Tools */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Tools</div>
            {["Mental Math", "Create Papers", "Burst Mode", "Dashboard", "Leaderboard"].map((t) => (
              <div key={t} style={{ marginBottom: 12 }}>
                <a href="#" style={{ fontSize: 14, color: "var(--white2)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "white"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--white2)"}
                >{t}</a>
              </div>
            ))}
          </div>

          {/* Branches */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Branches</div>
            {[
              { name: "Rohini Sector 16", city: "New Delhi" },
              { name: "Rohini Sector 11", city: "New Delhi" },
              { name: "Gurgaon", city: "Haryana" },
            ].map((b) => (
              <div key={b.name} style={{ marginBottom: 16, display: "flex", gap: 8 }}>
                <span style={{ color: "var(--purple2)", marginTop: 2, flexShrink: 0 }}><Icon.MapPin /></span>
                <div>
                  <div style={{ fontSize: 14, color: "var(--white2)" }}>{b.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{b.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glow-line" style={{ marginBottom: 24 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
            © 2024 Talent Hub Excellence Lab. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Contact"].map((link) => (
              <a key={link} href="#" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--white2)"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"}
              >{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function TalentHub() {
  return (
    <>
      <GlobalStyles />
      <div className="noise-overlay" />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <StatsBar />
        <Programs />
        <WhySection />
        <Toolkit />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}