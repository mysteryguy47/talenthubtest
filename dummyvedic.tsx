import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return y;
}

// ─────────────────────────────────────────
// FADE WRAPPER
// ─────────────────────────────────────────
function FadeIn({ children, delay = 0, dir = "up", style = {} }: {
  children: React.ReactNode; delay?: number;
  dir?: "up" | "left" | "right" | "none"; style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView();
  const t: Record<string, string> = { up: "translateY(30px)", left: "translateX(-30px)", right: "translateX(30px)", none: "none" };
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0, transform: inView ? "none" : t[dir],
      transition: `opacity .7s cubic-bezier(.4,0,.2,1) ${delay}s, transform .7s cubic-bezier(.4,0,.2,1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #080600;
      --bg2:      #0D0B05;
      --bg3:      #120F07;
      --surface:  #161209;
      --s2:       #1C1710;
      --border:   rgba(255,220,100,0.08);
      --b2:       rgba(255,220,100,0.14);
      --gold:     #D4A017;
      --gold2:    #E8B830;
      --gold3:    #F5CC60;
      --golddim:  rgba(212,160,23,0.12);
      --goldglow: rgba(212,160,23,0.22);
      --amber:    #B8741A;
      --cream:    #F5EDD0;
      --cream2:   #C8B888;
      --muted:    #5A5030;
      --white:    #FAF4E0;
      --red:      #C0392B;
      --font-serif: 'Playfair Display', Georgia, serif;
      --font-d:     'Syne', sans-serif;
      --font-b:     'DM Sans', sans-serif;
      --font-m:     'JetBrains Mono', monospace;
    }

    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--white); font-family: var(--font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: var(--goldglow); color: var(--white); }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 2px; }

    @keyframes float-slow  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-10px)} }
    @keyframes float-rev   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(10px)} }
    @keyframes glow-pulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
    @keyframes shimmer-g   { 0%{background-position:-400% center} 100%{background-position:400% center} }
    @keyframes reveal-num  { from{opacity:0;transform:scale(.8) translateY(10px)} to{opacity:1;transform:none} }
    @keyframes draw-line   { from{width:0} to{width:100%} }
    @keyframes sanskrit-fade { 0%{opacity:.06} 50%{opacity:.14} 100%{opacity:.06} }
    @keyframes step-in     { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:none} }
    @keyframes orbit-slow  { 0%{transform:rotate(0deg) translateX(90px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(90px) rotate(-360deg)} }
    @keyframes marquee     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes counter-in  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

    .gold-text {
      background: linear-gradient(135deg, var(--gold2) 0%, var(--gold3) 40%, var(--gold) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .shimmer-gold {
      background: linear-gradient(90deg, var(--cream2) 0%, var(--cream) 25%, var(--gold3) 50%, var(--cream) 75%, var(--cream2) 100%);
      background-size: 400% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer-g 5s linear infinite;
    }

    .lbl {
      font-family: var(--font-m); font-size: 10px; font-weight: 600;
      letter-spacing: .16em; text-transform: uppercase; color: var(--gold2);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .lbl::before { content: ''; display: block; width: 18px; height: 1px; background: var(--gold2); }

    .btn-gold {
      background: linear-gradient(135deg, var(--gold), #8a5e00);
      color: #1a1000; border: none; padding: 13px 26px; border-radius: 10px;
      font-family: var(--font-b); font-size: 15px; font-weight: 700;
      cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
    }
    .btn-gold::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.18),transparent); opacity:0; transition:opacity .25s; }
    .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(212,160,23,.4); }
    .btn-gold:hover::after { opacity: 1; }

    .btn-outline {
      background: transparent; color: var(--cream2); border: 1px solid var(--b2);
      padding: 13px 24px; border-radius: 10px; font-family: var(--font-b); font-size: 15px;
      font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease;
    }
    .btn-outline:hover { border-color: rgba(212,160,23,.5); background: rgba(212,160,23,.08); color: var(--white); transform: translateY(-2px); }

    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    .card:hover { border-color: rgba(212,160,23,.28); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.4), 0 0 30px rgba(212,160,23,.06); }

    /* Sanskrit decorative bg text */
    .sanskrit-bg {
      position: absolute; inset: 0; overflow: hidden; pointer-events: none;
      font-family: var(--font-serif); font-size: clamp(80px, 12vw, 160px);
      color: var(--gold); opacity: .07; line-height: 1.1; font-style: italic;
      display: flex; align-items: center; justify-content: center; letter-spacing: .02em;
      user-select: none; animation: sanskrit-fade 6s ease-in-out infinite;
    }
  `}</style>
);

// ─────────────────────────────────────────
// DATA
// ─────────────────────────────────────────
const SUTRAS = [
  { num: "01", name: "Ekadhikena Purvena",      eng: "By one more than the previous one",          use: "Squaring numbers ending in 5, recurring decimals" },
  { num: "02", name: "Nikhilam Navatashcaramam", eng: "All from 9, last from 10",                   use: "Fast multiplication near bases (10, 100, 1000)" },
  { num: "03", name: "Urdhva-Tiryagbhyam",       eng: "Vertically and cross-wise",                  use: "General multiplication of any size numbers" },
  { num: "04", name: "Paraavartya Yojayet",       eng: "Transpose and adjust",                       use: "Division by numbers with large digits" },
  { num: "05", name: "Shunyam Saamyasamuccaye",  eng: "When the sum is the same, that sum is zero", use: "Solving specific equation types instantly" },
  { num: "06", name: "Anurupyena",               eng: "Proportionately",                            use: "Multiplication and division by proportional adjustment" },
  { num: "07", name: "Sankalana-Vyavakalanabhyam", eng: "By addition and subtraction",              use: "Simultaneous equations, factoring" },
  { num: "08", name: "Puranapuranabhyam",         eng: "By completion or non-completion",            use: "Quadratic and cubic equations" },
  { num: "09", name: "Chalana-Kalanabhyam",       eng: "Differences and similarities",               use: "Factorization, differential calculus" },
  { num: "10", name: "Yaavadunam",               eng: "Whatever the extent of deficiency",           use: "Squaring numbers, finding roots" },
  { num: "11", name: "Vyashtisamanstih",          eng: "Part and whole",                             use: "Factorization of polynomials" },
  { num: "12", name: "Shesanyankena Charamena",  eng: "The remainders by the last digit",           use: "Recurring decimals expressed as fractions" },
  { num: "13", name: "Sopaantyadvayamantyam",     eng: "The ultimate and twice the penultimate",     use: "Specific fraction types and proportions" },
  { num: "14", name: "Ekanyunena Purvena",        eng: "By one less than the previous one",          use: "Multiplication by numbers consisting of 9s" },
  { num: "15", name: "Gunitasamuchyah",           eng: "The product of the sum equals the sum of the product", use: "Verification of results, checks" },
  { num: "16", name: "Gunakasamuchyah",           eng: "The factors of the sum equal the sum of the factors", use: "Verifying factorization and products" },
];

const LEVELS = [
  {
    num: "01", name: "Foundations of Speed",
    duration: "4 Months",
    desc: "Core sutras for addition, subtraction, and foundational multiplication. Students discover that arithmetic doesn't have to be slow.",
    topics: ["Ekadhikena Purvena", "Nikhilam multiplication", "Digit sums & casting nines", "Divisibility checks", "Squaring numbers ending in 5", "Base multiplication (×9, ×99, ×999)"],
    demo: { q: "45 × 45", a: "2025", method: "Ekadhikena Purvena: 4×5=20 → 25 → 2025", time: "2 sec" },
    color: "#D4A017",
  },
  {
    num: "02", name: "Algebraic Visualization",
    duration: "4 Months",
    desc: "General multiplication and division methods. Students handle 4–8 digit numbers mentally with consistent accuracy.",
    topics: ["Urdhva-Tiryagbhyam general multiplication", "Paraavartya division", "Square roots mentally", "Cube roots of perfect cubes", "Percentage calculations", "LCM & HCF shortcuts"],
    demo: { q: "997 × 998", a: "995,006", method: "Nikhilam: deficiencies are 3 & 2 → 995 | 06", time: "3 sec" },
    color: "#C89010",
  },
  {
    num: "03", name: "Advanced Trigonometry",
    duration: "4 Months",
    desc: "Competitive mathematics territory. Long division, complex fractions, and pattern-recognition for Olympiad-level problems.",
    topics: ["Recurring decimals as fractions", "Simultaneous equations", "Quadratic factorization", "Complex division patterns", "Advanced percentage", "Olympiad problem sets"],
    demo: { q: "1/19 as decimal", a: "0.052631578947...", method: "Ekadhikena: multiply by 2 at each step", time: "8 sec" },
    color: "#B87800",
  },
  {
    num: "04", name: "Mental Mastery",
    duration: "4 Months",
    desc: "Championship-level application. All 16 sutras in combination. Students achieve reliable mental computation at exam speed.",
    topics: ["All 16 sutras integrated", "Polynomial operations", "Advanced roots & powers", "Competition problem solving", "Speed drills — timed", "National Olympiad preparation"],
    demo: { q: "34,619,347 × 99,999,999", a: "3,461,934,665,380,653", method: "Nikhilam near base 10⁸", time: "12 sec" },
    color: "#A06800",
  },
];

const OUTCOMES = [
  { icon: "⚡", title: "Calculation Speed", desc: "Multiply 8-digit numbers in seconds. Operations that take 2 minutes on paper complete in under 10 seconds mentally." },
  { icon: "🎯", title: "Exam Advantage",    desc: "Students consistently finish calculation-heavy exam sections 15–20 minutes early, giving time to verify and think." },
  { icon: "🧮", title: "All Four Operations", desc: "Addition, subtraction, multiplication, division — plus LCM, HCF, square roots, cube roots, percentages, and fractions." },
  { icon: "🔍", title: "Pattern Recognition", desc: "The sutras teach the underlying logic of numbers. Students stop memorizing and start seeing patterns everywhere." },
  { icon: "📜", title: "Ancient Wisdom",    desc: "Derived from Vedic literature over 3,000 years old. Rediscovered and systematized by Jagadguru Sri Bharati Krsna Tirthaji." },
  { icon: "🏆", title: "Olympiad Ready",    desc: "Level 4 students compete comfortably in national and international math olympiads — and they win." },
];

const FAQS = [
  { q: "What age is right for Vedic Maths?", a: "Vedic Maths is ideal from age 10 onwards (Class 5+), once students have a solid foundation in basic arithmetic. It's particularly powerful for Class 8–12 students preparing for competitive exams." },
  { q: "Is this just tricks, or real mathematics?", a: "Vedic Maths is derived from ancient sutras — literally Sanskrit aphorisms about mathematical processes. These aren't tricks; they're algorithms that work because of deeper number theory. Students who understand the why behind each sutra gain a lasting advantage." },
  { q: "How does it help with board exams and JEE?", a: "The speed gains are most felt in Class 10 and 12 boards, JEE, NEET, and Olympiad prep. Students gain 15–25 minutes per paper by computing faster — time they use to verify answers and attempt higher-order questions." },
  { q: "Can a student join mid-course?", a: "Yes, after a brief placement assessment. Level 1 covers foundational sutras that every student must know. If a student has prior exposure, we may place them at Level 2." },
  { q: "What does the kit include?", a: "Structured course books for each level, a premium Talent Hub bag, and an official academy t-shirt. There is no physical tool for Vedic Maths — the method is entirely mental." },
];

// ─────────────────────────────────────────
// NAV
// ─────────────────────────────────────────
function Nav() {
  const y = useScrollY();
  const sc = y > 40;
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 24px",
      borderBottom: sc ? "1px solid rgba(212,160,23,.12)" : "1px solid transparent",
      backdropFilter: sc ? "blur(24px)" : "none",
      background: sc ? "rgba(8,6,0,.92)" : "transparent",
      transition: "all .3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 14, color: "white" }}>T</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, color: "var(--white)", letterSpacing: "-.02em" }}>Talent Hub</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 8, color: "var(--muted)", letterSpacing: ".14em", textTransform: "uppercase" }}>Excellence Lab</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["Courses", "Papers", "Mental Math", "Burst"].map(n => (
            <button key={n} style={{ background: "none", border: "none", color: "var(--cream2)", fontFamily: "var(--font-b)", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 14px", borderRadius: 8, transition: "all .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--white)"; (e.target as HTMLElement).style.background = "rgba(212,160,23,.06)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--cream2)"; (e.target as HTMLElement).style.background = "none"; }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline" style={{ padding: "9px 18px", fontSize: 14 }}>Sign In</button>
          <button className="btn-gold" style={{ padding: "9px 18px", fontSize: 14 }}>Enroll Now →</button>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────
// HERO
// ─────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [calcStep, setCalcStep] = useState(0);
  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);
  useEffect(() => {
    const t = setInterval(() => setCalcStep(s => (s + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);

  const CALC_DEMOS = [
    { q: "997 × 998", a: "= 995,006", hint: "Nikhilam · 3 sec" },
    { q: "45²",       a: "= 2,025",   hint: "Ekadhikena · 1 sec" },
    { q: "√7,921",    a: "= 89",      hint: "Dwandwa Yoga · 4 sec" },
    { q: "1 ÷ 19",    a: "= 0.0526…", hint: "Recurring decimals · 8 sec" },
  ];

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 68 }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 20% 50%, rgba(212,160,23,.08) 0%, transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 80% 70%, rgba(184,116,26,.05) 0%, transparent 60%)" }} />

      {/* Ancient grid — paper texture feel */}
      <div style={{
        position: "absolute", inset: 0, opacity: .3,
        backgroundImage: "linear-gradient(rgba(212,160,23,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.06) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
      }} />

      {/* Sanskrit watermark */}
      <div className="sanskrit-bg">ॐ</div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%", display: "grid", gridTemplateColumns: "55% 45%", gap: 60, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .5s ease .1s", display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(212,160,23,.1)", border: "1px solid rgba(212,160,23,.22)", borderRadius: 100, padding: "7px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--gold2)", fontStyle: "italic" }}>अथर्ववेद</span>
            <span style={{ width: 1, height: 12, background: "rgba(212,160,23,.3)" }} />
            <span style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--gold2)", letterSpacing: ".06em" }}>Ancient Mental Architecture</span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-serif)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-.02em",
            marginBottom: 16, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(24px)",
            transition: "all .7s cubic-bezier(.4,0,.2,1) .2s",
          }}>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)", color: "var(--white)", fontStyle: "italic" }}>Vedic</span>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)", fontStyle: "normal" }} className="gold-text">Sutras.</span>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)", color: "var(--white)", fontStyle: "italic" }}>Mental Speed.</span>
          </h1>

          <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,var(--gold),transparent)", borderRadius: 2, marginBottom: 24, opacity: loaded ? 1 : 0, transition: "opacity .7s ease .5s" }} />

          <p style={{ fontSize: 17, lineHeight: 1.8, color: "var(--cream2)", maxWidth: 460, marginBottom: 36, fontFamily: "var(--font-b)", fontWeight: 300, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .7s ease .35s" }}>
            16 sacred sutras from Vedic literature. Solve 997 × 998 in three seconds. Finish exam sections twenty minutes early. Mathematics as it was always meant to be experienced — through the mind.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .45s" }}>
            <button className="btn-gold">Enroll in Vedic Maths →</button>
            <button className="btn-outline">Book Free Trial</button>
          </div>

          <div style={{ display: "flex", gap: 28, marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(212,160,23,.1)", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .6s" }}>
            {[["16", "Sacred Sutras"], ["4", "Levels"], ["Ages 10+", "Ideal From"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 800, color: "var(--white)" }}>{v}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — calculation showcase */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(32px)", transition: "all .9s cubic-bezier(.4,0,.2,1) .3s", position: "relative" }}>
          <div style={{
            background: "linear-gradient(145deg, var(--s2), var(--bg3))",
            border: "1px solid var(--b2)", borderRadius: 28,
            padding: "36px", position: "relative", overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0,0,0,.6), 0 0 60px rgba(212,160,23,.07)",
          }}>
            {/* Sanskrit watermark inside card */}
            <div style={{ position: "absolute", top: -10, right: 10, fontFamily: "var(--font-serif)", fontSize: 120, color: "var(--gold)", opacity: .04, pointerEvents: "none", userSelect: "none", lineHeight: 1 }}>ॐ</div>

            {/* Top accent */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--gold), transparent)" }} />

            <div className="lbl" style={{ marginBottom: 20 }}>Calculation Sync — Live Demos</div>

            {/* Main calc display */}
            <div key={calcStep} style={{ animation: "reveal-num .4s ease both", marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3vw,44px)", fontWeight: 700, color: "var(--cream)", letterSpacing: "-.01em", marginBottom: 6 }}>
                {CALC_DEMOS[calcStep].q}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px,2.5vw,36px)", fontWeight: 800, marginBottom: 10 }} className="gold-text">
                {CALC_DEMOS[calcStep].a}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)", letterSpacing: ".06em" }}>{CALC_DEMOS[calcStep].hint}</div>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", opacity: .6 }} />
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: "rgba(212,160,23,.12)", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
              <div key={calcStep} style={{ height: "100%", background: "linear-gradient(90deg, var(--gold), var(--gold3))", borderRadius: 2, animation: "draw-line 2.2s linear both" }} />
            </div>

            {/* Method breakdown */}
            <div style={{ background: "rgba(212,160,23,.06)", border: "1px solid rgba(212,160,23,.12)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Method</div>
              <div style={{ fontFamily: "var(--font-b)", fontSize: 14, color: "var(--cream2)", lineHeight: 1.6 }}>
                {["Nikhilam: deficiencies 3 & 2 → (997−2) | (3×2) → 995 | 06",
                  "Ekadhikena: (4+1)×4 = 20, append 25 → 2025",
                  "Dwandwa Yoga: pair digits, subtract duplex sequences",
                  "Sequentially multiply by 2 (osculator), 19 steps"][calcStep]}
              </div>
            </div>

            {/* Dot navigation */}
            <div style={{ display: "flex", gap: 6, marginTop: 20, justifyContent: "center" }}>
              {CALC_DEMOS.map((_, i) => (
                <div key={i} onClick={() => setCalcStep(i)} style={{ width: i === calcStep ? 20 : 6, height: 6, borderRadius: 3, background: i === calcStep ? "var(--gold)" : "rgba(212,160,23,.2)", transition: "all .3s ease", cursor: "pointer" }} />
              ))}
            </div>
          </div>

          {/* Float badges */}
          <div style={{ position: "absolute", top: -18, right: -18, background: "linear-gradient(135deg, #2a1a00, #1a0e00)", border: "1px solid rgba(212,160,23,.3)", borderRadius: 14, padding: "10px 16px", animation: "float-slow 4s ease-in-out infinite", boxShadow: "0 8px 28px rgba(0,0,0,.5)" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--gold2)", letterSpacing: ".1em", textTransform: "uppercase" }}>Age Range</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: "var(--cream)" }}>10+ · Class 5 Onwards</div>
          </div>
          <div style={{ position: "absolute", bottom: 70, left: -24, background: "rgba(8,6,0,.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(212,160,23,.18)", borderRadius: 14, padding: "12px 16px", animation: "float-rev 5s ease-in-out infinite 1.2s", boxShadow: "0 8px 28px rgba(0,0,0,.5)" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Olympiad Achievement</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 700, color: "var(--cream)" }}>National Winners 🥇</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// 16 SUTRAS SHOWCASE
// ─────────────────────────────────────────
function SutrasSection() {
  const [active, setActive] = useState(1);
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,23,.3), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "flex-start", marginBottom: 56 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 16 }}>The Foundation</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px,3.5vw,52px)", fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1.1 }}>
                The 16 <span className="gold-text">Sacred Sutras</span>
              </h2>
            </div>
            <div style={{ paddingTop: 16 }}>
              <p style={{ color: "var(--cream2)", fontSize: 15, lineHeight: 1.75, fontWeight: 300 }}>
                Every technique in Vedic Maths flows from 16 Sanskrit sutras — aphorisms that describe universal mathematical truths. Each sutra is a key. Master all 16 and no calculation problem is beyond reach.
              </p>
            </div>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: sutra list */}
          <FadeIn dir="left">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 560, overflowY: "auto", paddingRight: 8 }}>
              {SUTRAS.map((s, i) => (
                <button key={i} onClick={() => setActive(i)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: active === i ? "rgba(212,160,23,.1)" : "transparent",
                  border: `1px solid ${active === i ? "rgba(212,160,23,.3)" : "transparent"}`,
                  borderRadius: 12, textAlign: "left", cursor: "pointer", width: "100%",
                  transition: "all .2s ease",
                }}>
                  <span style={{ fontFamily: "var(--font-m)", fontSize: 11, color: active === i ? "var(--gold2)" : "var(--muted)", minWidth: 22, letterSpacing: ".06em" }}>{s.num}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 700, color: active === i ? "var(--cream)" : "var(--cream2)", fontStyle: "italic" }}>{s.name}</div>
                    <div style={{ fontFamily: "var(--font-b)", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{s.eng}</div>
                  </div>
                  {active === i && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Right: detail */}
          <FadeIn dir="right">
            <div key={active} style={{
              background: "var(--surface)", border: "1px solid rgba(212,160,23,.2)", borderRadius: 24, padding: "40px",
              position: "relative", overflow: "hidden", animation: "counter-in .35s ease both",
              boxShadow: "0 0 60px rgba(212,160,23,.05)",
              minHeight: 340,
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--gold),transparent)" }} />
              <div style={{ position: "absolute", bottom: -20, right: -20, fontFamily: "var(--font-serif)", fontSize: 120, color: "var(--gold)", opacity: .04, pointerEvents: "none", userSelect: "none", lineHeight: 1 }}>
                {SUTRAS[active].num}
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,160,23,.1)", border: "1px solid rgba(212,160,23,.22)", borderRadius: 8, padding: "4px 12px", marginBottom: 20 }}>
                <span style={{ fontFamily: "var(--font-m)", fontSize: 10, fontWeight: 700, color: "var(--gold2)", letterSpacing: ".12em" }}>SUTRA {SUTRAS[active].num}</span>
              </div>

              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 800, fontStyle: "italic", letterSpacing: "-.01em", color: "var(--cream)", marginBottom: 10, lineHeight: 1.2 }}>
                {SUTRAS[active].name}
              </h3>

              <div style={{ fontFamily: "var(--font-b)", fontSize: 15, fontWeight: 300, color: "var(--gold2)", marginBottom: 24, fontStyle: "italic" }}>
                "{SUTRAS[active].eng}"
              </div>

              <div style={{ background: "rgba(212,160,23,.07)", border: "1px solid rgba(212,160,23,.14)", borderRadius: 12, padding: "18px" }}>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Applied In</div>
                <div style={{ fontFamily: "var(--font-b)", fontSize: 15, color: "var(--cream2)", lineHeight: 1.65 }}>{SUTRAS[active].use}</div>
              </div>

              {/* Adjacent sutra navigation */}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                {active > 0 && (
                  <button onClick={() => setActive(a => a - 1)} style={{ flex: 1, background: "rgba(212,160,23,.06)", border: "1px solid rgba(212,160,23,.14)", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)", transition: "all .2s" }}
                    onMouseEnter={e => (e.target as HTMLElement).style.borderColor = "rgba(212,160,23,.3)"}
                    onMouseLeave={e => (e.target as HTMLElement).style.borderColor = "rgba(212,160,23,.14)"}
                  >← Sutra {SUTRAS[active - 1].num}</button>
                )}
                {active < 15 && (
                  <button onClick={() => setActive(a => a + 1)} style={{ flex: 1, background: "rgba(212,160,23,.06)", border: "1px solid rgba(212,160,23,.14)", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)", transition: "all .2s" }}
                    onMouseEnter={e => (e.target as HTMLElement).style.borderColor = "rgba(212,160,23,.3)"}
                    onMouseLeave={e => (e.target as HTMLElement).style.borderColor = "rgba(212,160,23,.14)"}
                  >Sutra {SUTRAS[active + 1].num} →</button>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// LEVELS SECTION
// ─────────────────────────────────────────
function LevelsSection() {
  const [active, setActive] = useState(0);
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom: 56 }}>
            <div className="lbl" style={{ marginBottom: 16 }}>Course Structure</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px,4vw,52px)", fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 16 }}>
              Four Levels. <span className="gold-text">One Mastery.</span>
            </h2>
            <p style={{ color: "var(--cream2)", fontSize: 16, maxWidth: 500, lineHeight: 1.75, fontWeight: 300 }}>
              Each level builds on the last — from core sutra mechanics to championship-speed competitive mathematics.
            </p>
          </div>
        </FadeIn>

        {/* Level tabs */}
        <FadeIn delay={0.1}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 32 }}>
            {LEVELS.map((lvl, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                padding: "16px", borderRadius: 14,
                background: active === i ? "rgba(212,160,23,.12)" : "var(--surface)",
                border: `1px solid ${active === i ? "rgba(212,160,23,.32)" : "var(--border)"}`,
                cursor: "pointer", textAlign: "left", transition: "all .25s ease",
                boxShadow: active === i ? "0 0 30px rgba(212,160,23,.06)" : "none",
              }}>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: active === i ? "var(--gold2)" : "var(--muted)", letterSpacing: ".12em", marginBottom: 6 }}>LEVEL {lvl.num}</div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 700, color: active === i ? "var(--cream)" : "var(--cream2)", fontStyle: "italic", lineHeight: 1.2 }}>{lvl.name}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginTop: 6 }}>{lvl.duration}</div>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Detail */}
        <div key={active} style={{ animation: "counter-in .35s ease both", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <FadeIn dir="left">
            <div style={{ background: "var(--surface)", border: `1px solid rgba(212,160,23,.22)`, borderRadius: 24, padding: "36px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${LEVELS[active].color}, transparent)` }} />
              <div style={{ position: "absolute", bottom: -10, right: 0, fontFamily: "var(--font-serif)", fontSize: 100, color: "var(--gold)", opacity: .04, userSelect: "none", lineHeight: 1 }}>{LEVELS[active].num}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ background: "rgba(212,160,23,.12)", border: "1px solid rgba(212,160,23,.24)", borderRadius: 8, padding: "4px 12px", fontFamily: "var(--font-m)", fontSize: 11, fontWeight: 700, color: "var(--gold2)", letterSpacing: ".1em" }}>LEVEL {LEVELS[active].num}</span>
                <span style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)" }}>{LEVELS[active].duration}</span>
              </div>

              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px,2.5vw,30px)", fontWeight: 800, fontStyle: "italic", letterSpacing: "-.01em", color: "var(--cream)", marginBottom: 16 }}>
                {LEVELS[active].name}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--cream2)", fontWeight: 300, marginBottom: 24 }}>{LEVELS[active].desc}</p>

              {/* Demo calc */}
              <div style={{ background: "rgba(212,160,23,.07)", border: "1px solid rgba(212,160,23,.16)", borderRadius: 14, padding: "20px" }}>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>Level {LEVELS[active].num} Sample Problem</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 700, color: "var(--cream)", marginBottom: 4 }}>{LEVELS[active].demo.q}</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800 }} className="gold-text">{LEVELS[active].demo.a}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Solved in</div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 18, fontWeight: 800, color: "var(--gold2)" }}>{LEVELS[active].demo.time}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontFamily: "var(--font-b)", fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>{LEVELS[active].demo.method}</div>
              </div>
            </div>
          </FadeIn>

          <FadeIn dir="right">
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "36px" }}>
              <div className="lbl" style={{ marginBottom: 20 }}>Topics Covered</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {LEVELS[active].topics.map((topic, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, animation: `step-in .3s ease ${i * 0.06}s both` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: LEVELS[active].color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "var(--cream2)" }}>{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// OUTCOMES
// ─────────────────────────────────────────
function Outcomes() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,23,.3), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>What Students Gain</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 900, letterSpacing: "-.02em" }}>
              Why Vedic Maths <span className="gold-text">Changes Everything</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="card" style={{ padding: "28px" }}>
                <div style={{ fontSize: 30, marginBottom: 16 }}>{o.icon}</div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, fontStyle: "italic", letterSpacing: "-.01em", marginBottom: 10, color: "var(--cream)" }}>{o.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--cream2)", fontWeight: 300 }}>{o.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>Questions</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3vw,44px)", fontWeight: 900, letterSpacing: "-.02em", fontStyle: "italic" }}>Answered</h2>
          </div>
        </FadeIn>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div style={{ background: open === i ? "var(--surface)" : "transparent", border: `1px solid ${open === i ? "rgba(212,160,23,.25)" : "var(--border)"}`, borderRadius: 16, overflow: "hidden", transition: "all .3s ease" }}>
                <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, color: "var(--cream)", fontStyle: "italic" }}>{f.q}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: open === i ? "rgba(212,160,23,.2)" : "var(--surface)", border: `1px solid ${open === i ? "rgba(212,160,23,.3)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .25s ease", transform: open === i ? "rotate(45deg)" : "none", color: open === i ? "var(--gold2)" : "var(--muted)", fontSize: 16 }}>+</div>
                </button>
                {open === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 15, lineHeight: 1.75, color: "var(--cream2)", fontWeight: 300, animation: "counter-in .3s ease both" }}>{f.a}</div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// CTA
// ─────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding: "80px 24px", background: "var(--bg2)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "linear-gradient(135deg, #1a1200 0%, #0e0900 50%, #080600 100%)", border: "1px solid rgba(212,160,23,.22)", padding: "72px 64px", boxShadow: "0 40px 100px rgba(0,0,0,.5)" }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,160,23,.18), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,160,23,.08), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(212,160,23,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.03) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
            {/* Sanskrit background */}
            <div style={{ position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-serif)", fontSize: 200, color: "var(--gold)", opacity: .04, userSelect: "none", lineHeight: 1 }}>ॐ</div>

            <div style={{ position: "relative", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,160,23,.1)", border: "1px solid rgba(212,160,23,.22)", borderRadius: 100, padding: "6px 18px", marginBottom: 28 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--gold2)", fontStyle: "italic" }}>अथर्ववेद</span>
                <span style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em" }}>16 SUTRAS AWAIT</span>
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,4.5vw,56px)", fontWeight: 900, fontStyle: "italic", letterSpacing: "-.02em", lineHeight: 1.0, marginBottom: 20, color: "var(--cream)" }}>
                Start the Journey<br /><span className="shimmer-gold">into Ancient Speed.</span>
              </h2>
              <p style={{ fontSize: 17, color: "rgba(245,237,208,.55)", lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>
                One free demo class. Experience the sutra method first-hand and see why students describe their first Vedic Maths session as a revelation.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={{ background: "linear-gradient(135deg, var(--gold), #8a5e00)", color: "#1a1000", border: "none", padding: "15px 32px", borderRadius: 14, fontFamily: "var(--font-b)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "all .25s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(212,160,23,.35)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  Book Free Demo →
                </button>
                <button className="btn-outline" style={{ borderColor: "rgba(212,160,23,.25)", color: "rgba(245,237,208,.7)" }}>📞 Call Us</button>
              </div>
              <div style={{ marginTop: 28, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                {["Free trial class", "Ages 10 & above", "All three branches"].map(t => (
                  <span key={t} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "rgba(212,160,23,.4)", letterSpacing: ".04em" }}>✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "var(--bg)", borderTop: "1px solid rgba(212,160,23,.1)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 12, color: "white" }}>T</span>
          </div>
          <span style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, color: "var(--white)" }}>Talent Hub Excellence Lab</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Rohini Sec-16", "Rohini Sec-11", "Gurgaon"].map(b => (
            <span key={b} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--muted)" }}>📍{b}</span>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)" }}>© 2024 Talent Hub. All rights reserved.</div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────
export default function VedicMathsPage() {
  return (
    <>
      <Styles />
      <Nav />
      <main>
        <Hero />
        <SutrasSection />
        <LevelsSection />
        <Outcomes />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}