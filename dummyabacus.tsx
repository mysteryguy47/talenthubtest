import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface InViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
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

// ─────────────────────────────────────────────
// FADE WRAPPER
// ─────────────────────────────────────────────
function FadeIn({ children, className = "", delay = 0, direction = "up" }: InViewProps) {
  const { ref, inView } = useInView();
  const offsets: Record<string, string> = {
    up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none",
  };
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : offsets[direction],
      transition: `opacity 0.65s cubic-bezier(.4,0,.2,1) ${delay}s, transform 0.65s cubic-bezier(.4,0,.2,1) ${delay}s`,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #06070F;
      --bg2:      #090B18;
      --surface:  #0E1023;
      --surface2: #131628;
      --border:   rgba(255,255,255,0.06);
      --border2:  rgba(255,255,255,0.1);
      --p:        #7B5CE5;
      --p2:       #9D7FF0;
      --p3:       #C4ADFF;
      --pglow:    rgba(123,92,229,0.22);
      --pdim:     rgba(123,92,229,0.1);
      --white:    #F0F2FF;
      --white2:   #B8BDD8;
      --muted:    #5A5F7A;
      --gold:     #E8A820;
      --teal:     #0FB8A0;
      --font-d:   'Syne', sans-serif;
      --font-b:   'DM Sans', sans-serif;
      --font-m:   'JetBrains Mono', monospace;
    }

    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--white); font-family: var(--font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: var(--pglow); }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: var(--p); border-radius: 2px; }

    /* ── keyframes ── */
    @keyframes float-slow  { 0%,100% { transform: translateY(0);    } 50% { transform: translateY(-10px); } }
    @keyframes bead-slide  { 0%      { transform: translateX(-30px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
    @keyframes shimmer-bg  { 0%   { background-position: -400% center; } 100% { background-position: 400% center; } }
    @keyframes pulse-dot   { 0%,100% { box-shadow: 0 0 0 0 rgba(123,92,229,.5); } 70% { box-shadow: 0 0 0 8px rgba(123,92,229,0); } }
    @keyframes spin-slow   { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes marquee     { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes counter-up  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @keyframes line-grow   { from { width: 0; } to { width: 100%; } }

    .grad-text {
      background: linear-gradient(135deg, var(--p2) 0%, #C084FC 45%, var(--p) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .gold-text {
      background: linear-gradient(135deg, var(--gold), #f5d060, var(--gold));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .shimmer {
      background: linear-gradient(90deg, var(--white2) 0%, var(--white) 30%, var(--p2) 50%, var(--white) 70%, var(--white2) 100%);
      background-size: 400% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer-bg 5s linear infinite;
    }

    .lbl {
      font-family: var(--font-m); font-size: 10px; font-weight: 600;
      letter-spacing: .14em; text-transform: uppercase; color: var(--p2);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .lbl::before { content: ''; display: block; width: 18px; height: 1px; background: var(--p2); }

    .btn-p {
      background: linear-gradient(135deg, var(--p), #5535c0);
      color: #fff; border: none; padding: 13px 26px; border-radius: 12px;
      font-family: var(--font-b); font-size: 15px; font-weight: 600;
      cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
    }
    .btn-p::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(255,255,255,.12),transparent); opacity: 0; transition: opacity .25s; }
    .btn-p:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(123,92,229,.4); }
    .btn-p:hover::after { opacity: 1; }

    .btn-s {
      background: transparent; color: var(--white2); border: 1px solid var(--border2);
      padding: 13px 24px; border-radius: 12px; font-family: var(--font-b); font-size: 15px;
      font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease; white-space: nowrap;
    }
    .btn-s:hover { border-color: rgba(123,92,229,.5); background: rgba(123,92,229,.08); color: var(--white); transform: translateY(-2px); }

    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    .card:hover { border-color: rgba(123,92,229,.3); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.35), 0 0 30px rgba(123,92,229,.07); }

    .level-tab { cursor: pointer; transition: all .25s ease; }
    .level-tab:hover { color: var(--white) !important; }
  `}</style>
);

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const JUNIOR_LEVELS = [
  { num: 1, name: "Foundation", duration: "4 Months", focus: "Abacus introduction, bead manipulation, single-digit addition & subtraction with the physical tool.", skills: ["Abacus anatomy & beads", "Single-digit addition", "Single-digit subtraction", "Number sense 1–99"], color: "#7B5CE5" },
  { num: 2, name: "Builder",    duration: "4 Months", focus: "2-digit operations, introduction to mental visualization — the pivotal shift from tool to mind.", skills: ["2-digit addition", "2-digit subtraction", "Carry & borrow logic", "Early mental imaging"], color: "#8B6CF0" },
  { num: 3, name: "Multiplier", duration: "4 Months", focus: "Multiplication enters. Students develop deeper bead-pattern memory and increase rows handled.", skills: ["2×1 multiplication", "3-digit operations", "Increased row count", "Speed building"], color: "#9D7FF0" },
  { num: 4, name: "Architect",  duration: "4 Months", focus: "Division introduced. Junior track complete — students have a solid mental math foundation.", skills: ["Basic division", "4-digit operations", "Mixed operations", "Junior certificate"], color: "#AE93F5" },
];

const REGULAR_LEVELS = [
  { num: 1,  name: "Basic I",     duration: "4 Months", focus: "Core addition and subtraction, foundational mental image building.", skills: ["Multi-digit addition", "Multi-digit subtraction", "Number visualization", "Accuracy drills"], color: "#7B5CE5" },
  { num: 2,  name: "Basic II",    duration: "4 Months", focus: "Complexity and digit count increase substantially. Mental abacus begins to form.", skills: ["5-row calculations", "Increased digit range", "Speed introduction", "Focus exercises"], color: "#8265E8" },
  { num: 3,  name: "Basic III",   duration: "4 Months", focus: "Multiplication enters the mental model. Students begin performing without the physical tool.", skills: ["Mental multiplication", "6-row calculations", "Physical tool removal", "Visualization lock-in"], color: "#8B6CF0" },
  { num: 4,  name: "Basic IV",    duration: "4 Months", focus: "Division and multi-operation calculations. Critical mental stamina development phase.", skills: ["Mental division", "Mixed operations", "8-row complexity", "Timed challenges"], color: "#946EF2" },
  { num: 5,  name: "Basic V",     duration: "4 Months", focus: "Decimal numbers and higher digit complexity. Accuracy and speed compound.", skills: ["Decimal operations", "9-row advanced", "High-speed drills", "Competitive prep"], color: "#9D7FF0" },
  { num: 6,  name: "Basic VI",    duration: "4 Months", focus: "Final basic level. Students achieve reliable mental calculation across all basic operations.", skills: ["All basic operations", "10-row calculations", "Basic level certification", "Olympiad readiness"], color: "#A680F3" },
  { num: 7,  name: "Advanced I",  duration: "4 Months", focus: "LCM and HCF introduced. Analytical reasoning expands.", skills: ["LCM & HCF", "Complex mixed ops", "Competitive difficulty", "Advanced speed"], color: "#AE93F5" },
  { num: 8,  name: "Advanced II", duration: "4 Months", focus: "Square roots enter. Problem complexity approaches competitive examination standard.", skills: ["Square root", "Advanced fractions", "Exam-level speed", "Pattern recognition"], color: "#B89BF8" },
  { num: 9,  name: "Advanced III",duration: "4 Months", focus: "Cube roots and compound operations. Very few reach this level — an exceptional milestone.", skills: ["Cube root", "Compound operations", "High-complexity sets", "National olympiad tier"], color: "#C4ADFF" },
  { num: 10, name: "Advanced IV", duration: "4 Months", focus: "Master level. All operations, all complexities. Certificate, medal, and complete cognitive mastery.", skills: ["All operations mastered", "Expert-level speed", "Master certification", "Champion tier"], color: "#D4BFFF" },
];

const OUTCOMES = [
  { icon: "🧠", title: "Mental Calculation Speed", desc: "Average 2× faster mental arithmetic after Level 3. Students solve multi-digit problems faster than a calculator." },
  { icon: "👁", title: "Visual Memory",            desc: "The mental abacus trains spatial memory that carries over into geometry, science, and reading comprehension." },
  { icon: "🎯", title: "Focus & Concentration",    desc: "Holding a moving abacus image in mind demands intense focus. Students report visible improvements in attention span." },
  { icon: "🏆", title: "Competition Readiness",    desc: "Regular monthly tests and yearly national/international olympiads give students real competitive experience — and wins." },
  { icon: "📜", title: "Certified Progression",    desc: "Every level completed earns a certificate and medal. Tangible milestones that build genuine pride and momentum." },
  { icon: "💼", title: "Complete Kit Included",    desc: "Professional abacus tool, course books, premium bag, and academy t-shirt. Everything needed from Day 1." },
];

const FAQS = [
  { q: "What age can my child start Abacus?", a: "Abacus is ideal from age 5 (Class 1 onwards). We offer a Junior track (Levels 1–4) for younger students and the Regular track (Levels 1–10) for Class 3 onwards." },
  { q: "How long does each level take?", a: "Each level takes approximately 4 months with regular weekly classes. Progression is tested — students advance only when they demonstrate readiness." },
  { q: "Are classes online or offline?", a: "We primarily teach offline at our three Delhi NCR branches (Rohini Sector 16, Rohini Sector 11, and Gurgaon). Batch timings are flexible — mornings, evenings, and weekends available." },
  { q: "What does the kit include?", a: "Each enrolled student receives a professional Abacus tool, structured course books for the level, a premium Talent Hub bag, and an official academy t-shirt." },
  { q: "How are monthly tests conducted?", a: "The last Sunday of every month is our assessment day. Students are tested on the current level's content under timed conditions — the same format as olympiad competitions." },
  { q: "Can students who join mid-level participate in olympiads?", a: "Yes, as long as they have completed at least one full level. Olympiad eligibility is level-based, not duration-based." },
];

const ABACUS_BEADS = [
  [1,0,1,1,0,1,1,0,1,0],
  [0,1,1,0,1,0,1,1,0,1],
  [1,1,0,1,0,1,0,1,1,0],
  [0,1,0,1,1,0,1,1,0,1],
  [1,0,1,0,1,1,0,0,1,1],
];

// ─────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────
function Nav() {
  const y = useScrollY();
  const scrolled = y > 40;
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      padding: "0 24px",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      backdropFilter: scrolled ? "blur(24px)" : "none",
      background: scrolled ? "rgba(6,7,15,.9)" : "transparent",
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
            <button key={n} style={{ background: "none", border: "none", color: "var(--white2)", fontFamily: "var(--font-b)", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 14px", borderRadius: 8, transition: "all .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "white"; (e.target as HTMLElement).style.background = "rgba(255,255,255,.05)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--white2)"; (e.target as HTMLElement).style.background = "none"; }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-s" style={{ padding: "9px 18px", fontSize: 14 }}>Sign In</button>
          <button className="btn-p" style={{ padding: "9px 18px", fontSize: 14 }}>Enroll Now →</button>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 68 }}>
      {/* Background layers */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(123,92,229,.1) 0%, transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%", display: "grid", gridTemplateColumns: "55% 45%", gap: 60, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .5s ease .1s", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(123,92,229,.1)", border: "1px solid rgba(123,92,229,.2)", borderRadius: 100, padding: "7px 14px", marginBottom: 28 }}>
            <span style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--p2)", letterSpacing: ".04em" }}>Ages 5–15 · Class 1 Onwards</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-d)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-.04em", marginBottom: 12, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(24px)", transition: "all .7s cubic-bezier(.4,0,.2,1) .2s" }}>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)", color: "var(--white)" }}>Master</span>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)" }} className="grad-text">Numbers</span>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)", color: "var(--white)" }}>With Precision.</span>
          </h1>

          <div style={{ width: 60, height: 3, background: "linear-gradient(90deg,var(--p),transparent)", borderRadius: 2, marginBottom: 24, opacity: loaded ? 1 : 0, transition: "opacity .7s ease .5s" }} />

          <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--white2)", maxWidth: 460, marginBottom: 36, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .7s ease .35s" }}>
            The ancient Japanese counting tool reimagined for the modern mind. Abacus training doesn't just build calculation speed — it permanently rewires how children visualize and think.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .45s" }}>
            <button className="btn-p">Enroll in Abacus →</button>
            <button className="btn-s">Book Free Trial</button>
          </div>

          <div style={{ display: "flex", gap: 28, marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--border)", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .6s" }}>
            {[["10", "Levels"], ["4 Mo", "Per Level"], ["5–15", "Age Range"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 28, fontWeight: 800, letterSpacing: "-.04em", color: "var(--white)" }}>{v}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Animated Abacus Visual */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(32px)", transition: "all .9s cubic-bezier(.4,0,.2,1) .3s", position: "relative" }}>
          <div style={{
            background: "linear-gradient(145deg, var(--surface2), var(--bg2))",
            border: "1px solid var(--border2)", borderRadius: 28,
            padding: "36px 28px", position: "relative", overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0,0,0,.5), 0 0 60px rgba(123,92,229,.1)",
          }}>
            {/* Glow */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,92,229,.2), transparent 70%)", pointerEvents: "none" }} />

            {/* Abacus frame label */}
            <div className="lbl" style={{ marginBottom: 20 }}>Live Abacus Visualizer</div>

            {/* Abacus rod structure */}
            <div style={{ position: "relative", background: "rgba(123,92,229,.04)", border: "1px solid rgba(123,92,229,.12)", borderRadius: 16, padding: "24px 20px" }}>
              {/* Top rail */}
              <div style={{ height: 4, background: "linear-gradient(90deg, #3d2a8a, #7B5CE5, #3d2a8a)", borderRadius: 2, marginBottom: 16 }} />

              {ABACUS_BEADS.map((row, ri) => (
                <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: ri < 4 ? 14 : 0, position: "relative" }}>
                  {/* Rod */}
                  <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "rgba(123,92,229,.2)", borderRadius: 1 }} />
                  {row.map((active, bi) => (
                    <div key={bi} style={{
                      width: "calc(10% - 4px)", height: 26, borderRadius: 6,
                      background: active
                        ? `linear-gradient(135deg, ${["#7B5CE5","#8B6CF0","#9D7FF0","#AE93F5","#7B5CE5"][ri]}, ${["#5535C0","#7055D8","#8268E0","#9680EE","#5535C0"][ri]})`
                        : "rgba(255,255,255,.06)",
                      border: active ? "1px solid rgba(255,255,255,.15)" : "1px solid rgba(255,255,255,.04)",
                      transition: "all .3s ease",
                      boxShadow: active ? `0 4px 12px ${["rgba(123,92,229,.4)","rgba(139,108,240,.4)","rgba(157,127,240,.4)","rgba(174,147,245,.4)","rgba(123,92,229,.4)"][ri]}` : "none",
                      animation: active ? `bead-slide .4s ease ${bi * 0.04}s both` : "none",
                      position: "relative",
                      zIndex: 1,
                    }} />
                  ))}
                </div>
              ))}

              {/* Bottom rail */}
              <div style={{ height: 4, background: "linear-gradient(90deg, #3d2a8a, #7B5CE5, #3d2a8a)", borderRadius: 2, marginTop: 16 }} />
            </div>

            {/* Display number */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Mental Calculation</div>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 36, fontWeight: 800, letterSpacing: "-.04em" }} className="grad-text">4,827 + 6,394</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", marginBottom: 4 }}>Result</div>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 28, fontWeight: 800, letterSpacing: "-.04em", color: "var(--p3)" }}>= 11,221</div>
              </div>
            </div>
          </div>

          {/* Float badge */}
          <div style={{
            position: "absolute", top: -18, right: -18,
            background: "linear-gradient(135deg, var(--gold), #d4900e)",
            borderRadius: 14, padding: "10px 16px",
            fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 13, color: "#1a0e00",
            boxShadow: "0 8px 28px rgba(232,168,32,.4)",
            animation: "float-slow 4s ease-in-out infinite",
          }}>
            🏅 Level 1–10 Track
          </div>

          {/* Float badge 2 */}
          <div style={{
            position: "absolute", bottom: 60, left: -24,
            background: "rgba(6,7,15,.92)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(123,92,229,.2)", borderRadius: 14,
            padding: "12px 16px",
            animation: "float-slow 5s ease-in-out infinite 1.2s",
            boxShadow: "0 8px 28px rgba(0,0,0,.4)",
          }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--p2)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Monthly Test</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "white" }}>Last Sunday of Month</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// TRACK SELECTOR + LEVEL MAP
// ─────────────────────────────────────────────
function LevelMap() {
  const [track, setTrack] = useState<"junior" | "regular">("regular");
  const [active, setActive] = useState(0);
  const levels = track === "junior" ? JUNIOR_LEVELS : REGULAR_LEVELS;

  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(123,92,229,.35), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom: 48 }}>
            <div className="lbl" style={{ marginBottom: 16 }}>Course Structure</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 16 }}>
              The <span className="grad-text">Progression</span> Map
            </h2>
            <p style={{ color: "var(--white2)", fontSize: 16, maxWidth: 500, lineHeight: 1.7 }}>
              Every level builds on the last. No skipping, no shortcuts — each milestone is earned through consistent practice and monthly assessment.
            </p>
          </div>
        </FadeIn>

        {/* Track tabs */}
        <FadeIn delay={0.1}>
          <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 4, gap: 4, marginBottom: 44 }}>
            {(["junior", "regular"] as const).map(t => (
              <button key={t} onClick={() => { setTrack(t); setActive(0); }} style={{
                padding: "10px 22px", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "var(--font-b)", fontSize: 14, fontWeight: 600, letterSpacing: ".01em",
                background: track === t ? "linear-gradient(135deg, var(--p), #5535C0)" : "transparent",
                color: track === t ? "white" : "var(--muted)",
                boxShadow: track === t ? "0 4px 16px rgba(123,92,229,.35)" : "none",
                transition: "all .25s ease",
              }}>
                {t === "junior" ? "Junior Track (Levels 1–4)" : "Regular Track (Levels 1–10)"}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
          {/* Level list */}
          <FadeIn direction="left">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {levels.map((lvl, i) => (
                <button key={i} onClick={() => setActive(i)} className="level-tab" style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: active === i ? "rgba(123,92,229,.12)" : "transparent",
                  border: `1px solid ${active === i ? "rgba(123,92,229,.3)" : "transparent"}`,
                  borderRadius: 14, textAlign: "left", cursor: "pointer",
                  color: active === i ? "var(--white)" : "var(--muted)",
                  transition: "all .2s ease",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: active === i ? `linear-gradient(135deg, ${lvl.color}40, ${lvl.color}20)` : "var(--surface)",
                    border: `1px solid ${active === i ? lvl.color + "50" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-m)", fontSize: 12, fontWeight: 700,
                    color: active === i ? lvl.color : "var(--muted)",
                    transition: "all .2s ease",
                  }}>
                    {String(lvl.num).padStart(2, "0")}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700 }}>
                      {track === "regular" && lvl.num <= 6 ? "Basic" : track === "regular" ? "Advanced" : "Junior"} {lvl.num}
                    </div>
                    <div style={{ fontFamily: "var(--font-m)", fontSize: 10, marginTop: 1, opacity: .7, letterSpacing: ".06em" }}>{lvl.name}</div>
                  </div>
                  {active === i && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--p)", animation: "pulse-dot 2s infinite" }} />}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Detail panel */}
          <FadeIn direction="right">
            <div key={`${track}-${active}`} style={{
              background: "var(--surface)", border: `1px solid ${levels[active].color}30`,
              borderRadius: 24, padding: "36px", position: "relative", overflow: "hidden",
              animation: "counter-up .35s ease both",
              boxShadow: `0 0 60px ${levels[active].color}08`,
            }}>
              {/* Top accent */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${levels[active].color}, transparent)` }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{
                      background: `linear-gradient(135deg, ${levels[active].color}30, ${levels[active].color}15)`,
                      border: `1px solid ${levels[active].color}40`,
                      borderRadius: 10, padding: "6px 14px",
                      fontFamily: "var(--font-m)", fontSize: 12, fontWeight: 700, color: levels[active].color,
                    }}>
                      Level {String(levels[active].num).padStart(2, "0")}
                    </div>
                    <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)", letterSpacing: ".08em" }}>
                      {levels[active].duration}
                    </div>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--white)" }}>
                    {levels[active].name}
                  </h3>
                </div>
                {/* Progress indicator */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginBottom: 6, letterSpacing: ".08em" }}>
                    PROGRESS {active + 1}/{levels.length}
                  </div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {levels.map((_, i) => (
                      <div key={i} onClick={() => setActive(i)} style={{
                        width: i === active ? 20 : 6, height: 6, borderRadius: 3,
                        background: i <= active ? levels[active].color : "var(--surface2)",
                        transition: "all .25s ease", cursor: "pointer",
                      }} />
                    ))}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--white2)", marginBottom: 28 }}>
                {levels[active].focus}
              </p>

              {/* Skills grid */}
              <div>
                <div className="lbl" style={{ marginBottom: 16 }}>What You'll Learn</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {levels[active].skills.map((skill, si) => (
                    <div key={si} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      borderRadius: 10, padding: "12px 14px",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: levels[active].color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "var(--white2)" }}>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next level teaser */}
              {active < levels.length - 1 && (
                <div style={{
                  marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: `linear-gradient(135deg, ${levels[active + 1].color}12, transparent)`,
                  border: `1px solid ${levels[active + 1].color}20`,
                  borderRadius: 12, padding: "14px 18px",
                }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".08em", marginBottom: 3 }}>NEXT LEVEL →</div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 15, fontWeight: 700, color: "var(--white)" }}>Level {levels[active + 1].num}: {levels[active + 1].name}</div>
                  </div>
                  <button onClick={() => setActive(a => a + 1)} style={{
                    background: `${levels[active + 1].color}20`, border: `1px solid ${levels[active + 1].color}30`,
                    borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                    fontFamily: "var(--font-b)", fontSize: 13, fontWeight: 600, color: levels[active + 1].color,
                    transition: "all .2s ease",
                  }}
                  onMouseEnter={e => (e.target as HTMLElement).style.background = `${levels[active + 1].color}30`}
                  onMouseLeave={e => (e.target as HTMLElement).style.background = `${levels[active + 1].color}20`}
                  >Preview →</button>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// OUTCOMES SECTION
// ─────────────────────────────────────────────
function Outcomes() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 16 }}>Outcomes</div>
              <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(30px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1 }}>
                What Abacus <span className="grad-text">Actually Does</span>
              </h2>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 300, lineHeight: 1.65 }}>
              Beyond calculation speed — the cognitive benefits that compound for life.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="card" style={{ padding: "28px" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{o.icon}</div>
                <h3 style={{ fontFamily: "var(--font-d)", fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 10, color: "var(--white)" }}>{o.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--white2)" }}>{o.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// KIT SECTION
// ─────────────────────────────────────────────
function KitSection() {
  const items = [
    { icon: "🧮", name: "Professional Abacus Tool", desc: "The actual instrument used in class and competition — quality-grade, durable, sized for children." },
    { icon: "📚", name: "Course Books", desc: "Level-specific workbooks with structured exercises, mental math drills, and practice sets." },
    { icon: "🎒", name: "Premium Talent Hub Bag", desc: "Branded premium backpack. Students wear it with pride — and it fits everything they need." },
    { icon: "👕", name: "Official Academy T-Shirt", desc: "The Talent Hub uniform, issued at enrolment. Worn during olympiads and events." },
  ];
  return (
    <section style={{ padding: "80px 24px", background: "var(--bg2)" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(123,92,229,.3), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>Included in Every Enrolment</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(28px,3vw,44px)", fontWeight: 800, letterSpacing: "-.03em" }}>
              The <span className="grad-text">Complete Kit</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {items.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="card" style={{ padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16, display: "block", animation: `float-slow ${4 + i}s ease-in-out infinite` }}>{item.icon}</div>
                <h4 style={{ fontFamily: "var(--font-d)", fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--white)" }}>{item.name}</h4>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--muted)" }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", icon: "🎯", title: "Join a Batch", desc: "Choose from morning, evening, or weekend batches at your nearest branch. One free demo class before committing.", color: "var(--p)" },
    { n: "02", icon: "📅", title: "Practice Weekly", desc: "Regular structured classes, monthly last-Sunday assessments, and our online practice portal for daily drills.", color: "var(--p2)" },
    { n: "03", icon: "📜", title: "Level Up", desc: "Pass the level assessment, receive your certificate and medal, and advance to the next stage of the journey.", color: "var(--p3)" },
    { n: "04", icon: "🏆", title: "Compete & Win", desc: "Enter national and international olympiads. Win tablets, cash prizes, and the confidence that only comes from winning.", color: "var(--gold)" },
  ];
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>The Journey</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(30px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em" }}>
              How It <span className="grad-text">Works</span>
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, position: "relative" }}>
          {/* Connector line */}
          <div style={{ position: "absolute", top: 40, left: "12.5%", right: "12.5%", height: 1, background: "linear-gradient(90deg, var(--p), var(--p3), var(--gold))", opacity: .3, pointerEvents: "none" }} />
          {steps.map((s, i) => (
            <FadeIn key={i} delay={i * 0.12}>
              <div className="card" style={{ padding: "28px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".12em", marginBottom: 8 }}>STEP {s.n}</div>
                <h4 style={{ fontFamily: "var(--font-d)", fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--white)" }}>{s.title}</h4>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--white2)" }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>Common Questions</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(28px,3vw,44px)", fontWeight: 800, letterSpacing: "-.03em" }}>
              FAQ
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div style={{
                background: open === i ? "var(--surface)" : "transparent",
                border: `1px solid ${open === i ? "rgba(123,92,229,.25)" : "var(--border)"}`,
                borderRadius: 16, overflow: "hidden",
                transition: "all .3s ease",
              }}>
                <button onClick={() => setOpen(open === i ? null : i)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16,
                }}>
                  <span style={{ fontFamily: "var(--font-d)", fontSize: 16, fontWeight: 700, color: "var(--white)", letterSpacing: "-.01em" }}>{f.q}</span>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: open === i ? "rgba(123,92,229,.2)" : "var(--surface)",
                    border: `1px solid ${open === i ? "rgba(123,92,229,.3)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .25s ease",
                    transform: open === i ? "rotate(45deg)" : "none",
                    color: open === i ? "var(--p2)" : "var(--muted)", fontSize: 16, fontWeight: 300,
                  }}>+</div>
                </button>
                {open === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 15, lineHeight: 1.75, color: "var(--white2)", animation: "counter-up .3s ease both" }}>
                    {f.a}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding: "80px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{
            position: "relative", borderRadius: 28, overflow: "hidden",
            background: "linear-gradient(135deg, #1e1050 0%, #110a38 50%, #0a061f 100%)",
            border: "1px solid rgba(123,92,229,.25)", padding: "72px 64px",
            boxShadow: "0 40px 100px rgba(0,0,0,.4)",
          }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,92,229,.25), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(157,127,240,.12), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

            <div style={{ position: "relative", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(28px,5vw,56px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.0, marginBottom: 20, color: "white" }}>
                Begin the <span className="shimmer">Abacus Journey</span>
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 40 }}>
                One free demo class. See the method, meet the teacher, and experience what 18 years of refinement looks like in action.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={{ background: "white", color: "#1a0e4f", border: "none", padding: "15px 30px", borderRadius: 14, fontFamily: "var(--font-b)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "all .25s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(255,255,255,.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  Book Free Session →
                </button>
                <button className="btn-s" style={{ borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.8)" }}>
                  📞 Call Us
                </button>
              </div>
              <div style={{ marginTop: 28, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                {["No commitment", "Free trial class", "All age groups"].map(t => (
                  <span key={t} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: ".04em" }}>✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER (minimal)
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 12, color: "white" }}>T</span>
          </div>
          <span style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, color: "var(--white)" }}>Talent Hub Excellence Lab</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Rohini Sec-16", "Rohini Sec-11", "Gurgaon"].map(b => (
            <span key={b} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>📍{b}</span>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)" }}>© 2024 Talent Hub. All rights reserved.</div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function AbacusPage() {
  return (
    <>
      <Styles />
      <Nav />
      <main>
        <Hero />
        <LevelMap />
        <Outcomes />
        <HowItWorks />
        <KitSection />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}