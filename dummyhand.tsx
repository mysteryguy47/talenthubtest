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
  const t: Record<string, string> = { up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none" };
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
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #F6F3EE;
      --bg2:      #EDE9E1;
      --bg3:      #E4DFD4;
      --dark:     #0E0D0B;
      --dark2:    #1A1916;
      --dark3:    #252420;
      --surface:  #FFFFFF;
      --surfaced: #1E1D1A;
      --border:   rgba(14,13,11,0.1);
      --bdark:    rgba(255,255,255,0.08);
      --ink:      #2C2A24;
      --ink2:     #5A5750;
      --teal:     #0A7A6A;
      --teal2:    #0C9980;
      --teal3:    #40BBA8;
      --tealfade: rgba(10,122,106,0.12);
      --tealfade2:rgba(10,122,106,0.22);
      --navy:     #1C2E4A;
      --cream:    #FDF8F0;
      --font-serif: 'Cormorant Garamond', Georgia, serif;
      --font-d:     'Syne', sans-serif;
      --font-b:     'DM Sans', sans-serif;
      --font-m:     'JetBrains Mono', monospace;
    }

    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: rgba(10,122,106,0.2); }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 2px; }

    @keyframes float-slow  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes float-rev   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
    @keyframes draw-stroke { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
    @keyframes ink-drop    { from{opacity:0;transform:scale(.6)} to{opacity:1;transform:scale(1)} }
    @keyframes line-grow   { from{width:0} to{width:100%} }
    @keyframes fade-word   { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:none} }
    @keyframes nib-write   { 0%{stroke-dashoffset:400} 100%{stroke-dashoffset:0} }
    @keyframes shimmer-t   { 0%{background-position:-400% center} 100%{background-position:400% center} }
    @keyframes reveal      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    @keyframes rule-in     { from{transform:scaleX(0)} to{transform:scaleX(1)} }

    .teal-text {
      background: linear-gradient(135deg, var(--teal) 0%, var(--teal3) 50%, var(--teal2) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .shimmer-teal {
      background: linear-gradient(90deg, var(--ink2) 0%, var(--ink) 25%, var(--teal2) 50%, var(--ink) 75%, var(--ink2) 100%);
      background-size: 400% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer-t 5s linear infinite;
    }

    .lbl {
      font-family: var(--font-m); font-size: 10px; font-weight: 600;
      letter-spacing: .16em; text-transform: uppercase; color: var(--teal);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .lbl::before { content: ''; display: block; width: 18px; height: 1px; background: var(--teal); }

    .lbl-light {
      font-family: var(--font-m); font-size: 10px; font-weight: 600;
      letter-spacing: .16em; text-transform: uppercase; color: var(--teal3);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .lbl-light::before { content: ''; display: block; width: 18px; height: 1px; background: var(--teal3); }

    .btn-teal {
      background: linear-gradient(135deg, var(--teal), #054d40);
      color: #fff; border: none; padding: 13px 26px; border-radius: 10px;
      font-family: var(--font-b); font-size: 15px; font-weight: 600;
      cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
    }
    .btn-teal::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.14),transparent); opacity:0; transition:opacity .25s; }
    .btn-teal:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(10,122,106,.35); }
    .btn-teal:hover::after { opacity: 1; }

    .btn-outline-light {
      background: transparent; color: var(--ink2); border: 1px solid var(--border);
      padding: 13px 24px; border-radius: 10px; font-family: var(--font-b); font-size: 15px;
      font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease;
    }
    .btn-outline-light:hover { border-color: rgba(10,122,106,.4); background: rgba(10,122,106,.06); color: var(--ink); transform: translateY(-2px); }

    .btn-outline-dark {
      background: transparent; color: rgba(255,255,255,.7); border: 1px solid rgba(255,255,255,.15);
      padding: 13px 24px; border-radius: 10px; font-family: var(--font-b); font-size: 15px;
      font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease;
    }
    .btn-outline-dark:hover { border-color: rgba(10,153,128,.5); background: rgba(10,122,106,.12); color: white; transform: translateY(-2px); }

    .card-light {
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    .card-light:hover { border-color: rgba(10,122,106,.28); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.1), 0 0 30px rgba(10,122,106,.05); }

    .card-dark {
      background: var(--surfaced); border: 1px solid rgba(255,255,255,.07); border-radius: 18px;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    .card-dark:hover { border-color: rgba(10,153,128,.3); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.35); }

    /* Ruled lines bg */
    .ruled {
      background-image: repeating-linear-gradient(
        transparent, transparent 31px, rgba(10,122,106,.1) 31px, rgba(10,122,106,.1) 32px
      );
      background-size: 100% 32px;
    }

    /* Ink paper texture */
    .paper {
      background: var(--cream);
      background-image:
        radial-gradient(ellipse at 20% 30%, rgba(10,122,106,.03) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 70%, rgba(28,46,74,.04) 0%, transparent 60%);
    }
  `}</style>
);

// ─────────────────────────────────────────
// DATA
// ─────────────────────────────────────────
const ENGLISH_CURRICULUM = [
  { week: "Weeks 1–2",  topic: "Letter Formation Fundamentals",    detail: "Correct grip, posture, baseline alignment, and uniform letter sizing. Building the muscle-memory foundation." },
  { week: "Weeks 3–4",  topic: "Lowercase Fluency",               detail: "All 26 lowercase letters. Consistent stroke direction, entry and exit strokes, letter spacing principles." },
  { week: "Weeks 5–6",  topic: "Uppercase Mastery",               detail: "All 26 uppercase letters with proper proportions. Mixed case writing, beginning sentence-level work." },
  { week: "Weeks 7–8",  topic: "Joined Writing & Word Flow",       detail: "Cursive joining techniques, word-level fluency, eliminating pen lifts, building writing rhythm." },
  { week: "Weeks 9–10", topic: "Speed & Legibility Balance",       detail: "Increasing pace while maintaining consistency. Timed paragraph writing, self-assessment exercises." },
  { week: "Weeks 11–12", topic: "Calligraphy & Final Polish",      detail: "Decorative letterforms, greeting card writing, creative calligraphy strokes, presentation handwriting." },
];

const HINDI_CURRICULUM = [
  { week: "Weeks 1–2",  topic: "मात्राएँ और वर्णमाला",             detail: "Devanagari script foundations. Correct stroke sequence for all vowels and consonants. Shirorekha (header line) mastery." },
  { week: "Weeks 3–4",  topic: "व्यंजन — पूर्ण अक्षर",            detail: "All 36 consonants in their complete form. Proportional sizing, uniform spacing, balanced strokes." },
  { week: "Weeks 5–6",  topic: "संयुक्त अक्षर",                    detail: "Conjunct consonants and combined forms — the most challenging aspect of Hindi handwriting. Systematic practice." },
  { week: "Weeks 7–8",  topic: "शब्द और वाक्य लेखन",              detail: "Word-level writing. Proper spacing between words, line consistency, matra placement accuracy." },
  { week: "Weeks 9–10", topic: "गति और सुंदरता",                   detail: "Speed writing exercises while maintaining legibility. Hindi paragraph writing, dictation practice." },
  { week: "Weeks 11–12", topic: "सुलेख और कैलिग्राफी",             detail: "Decorative Devanagari calligraphy, artistic letterforms, certificate-quality presentation writing." },
];

const OUTCOMES = [
  { icon: "✍️", title: "Legibility in Weeks",    desc: "Students typically see measurable improvement in letter consistency and baseline alignment within the first 3 weeks — before habit changes." },
  { icon: "⚡", title: "Speed Without Sacrifice", desc: "The course specifically trains the balance between speed and clarity — the exact skill that matters in exams." },
  { icon: "🔤", title: "Bilingual Mastery",       desc: "English and Hindi tracks. Both run on the same scientific stroke-first methodology, just applied to each script's unique requirements." },
  { icon: "🎨", title: "Creative Calligraphy",    desc: "The final module introduces decorative writing — for greetings, certificates, and the pure joy of beautiful letters." },
  { icon: "🧠", title: "Fine Motor Improvement",  desc: "Handwriting is a fine motor skill. Improving it measurably strengthens the same neural pathways used in drawing, instrument playing, and spatial tasks." },
  { icon: "📜", title: "Certificate on Completion", desc: "Students who complete the 3-month course receive a Talent Hub certificate — a documented record of the improvement journey." },
];

const BEFORE_AFTER = [
  { label: "Letter Size",    before: "Inconsistent — varies 2× within same word", after: "Uniform, proportional to line height throughout" },
  { label: "Baseline",       before: "Words drift above or below the line",        after: "Consistent alignment across full sentences" },
  { label: "Spacing",        before: "Random gaps between letters and words",      after: "Even, deliberate spacing as a habit" },
  { label: "Stroke Quality", before: "Shaky, uneven pressure, hesitation visible", after: "Confident, smooth, consistent weight" },
  { label: "Speed",          before: "Either slow-careful or fast-illegible",      after: "Balanced — readable at full comfortable pace" },
];

const FAQS = [
  { q: "Is this course for any age?", a: "Yes. We offer the handwriting course for children from Class 1 upwards, as well as adults. The methodology is adapted by age — younger students focus on formation fundamentals, older students on speed and presentation." },
  { q: "Can a student take both English and Hindi tracks?", a: "Absolutely. Many students enroll in both. The courses can run simultaneously or sequentially. The Hindi and English tracks are independent — no prerequisite for either." },
  { q: "How long before improvement is visible?", a: "Most students and their parents notice visible change in letter consistency and baseline within 3–4 weeks. The transformation accelerates significantly by the 6-week mark." },
  { q: "Is there any practice at home?", a: "Yes — 10–15 minutes of daily practice at home is strongly recommended and part of the programme structure. We provide guided practice sheets for each week of the course." },
  { q: "What is creative calligraphy?", a: "The final module of both tracks introduces decorative letterforms — not necessarily pure calligraphy scripts, but artistic variations of the same letters students have been learning. It adds a creative dimension and teaches students to take pride in their writing." },
];

const WRITING_SAMPLES_EN = ["Beautiful", "Excellence", "Precision", "Confidence"];
const WRITING_SAMPLES_HI = ["सुंदर", "उत्कृष्टता", "स्पष्टता", "विश्वास"];

// ─────────────────────────────────────────
// NAV — LIGHT VERSION
// ─────────────────────────────────────────
function Nav() {
  const y = useScrollY();
  const sc = y > 40;
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "0 24px",
      borderBottom: sc ? "1px solid rgba(14,13,11,.12)" : "1px solid transparent",
      backdropFilter: sc ? "blur(24px)" : "none",
      background: sc ? "rgba(246,243,238,.92)" : "transparent",
      transition: "all .3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 14, color: "white" }}>T</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, color: "var(--ink)", letterSpacing: "-.02em" }}>Talent Hub</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 8, color: "var(--ink2)", letterSpacing: ".14em", textTransform: "uppercase" }}>Excellence Lab</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["Courses", "Papers", "Mental Math", "Burst"].map(n => (
            <button key={n} style={{ background: "none", border: "none", color: "var(--ink2)", fontFamily: "var(--font-b)", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 14px", borderRadius: 8, transition: "all .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--ink)"; (e.target as HTMLElement).style.background = "rgba(14,13,11,.05)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--ink2)"; (e.target as HTMLElement).style.background = "none"; }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline-light" style={{ padding: "9px 18px", fontSize: 14 }}>Sign In</button>
          <button className="btn-teal" style={{ padding: "9px 18px", fontSize: 14 }}>Enroll Now →</button>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────
// HERO — LIGHT BG, INK FEEL
// ─────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % WRITING_SAMPLES_EN.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 68, background: "var(--bg)" }}>
      {/* Ruled line overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(transparent, transparent 47px, rgba(10,122,106,.06) 47px, rgba(10,122,106,.06) 48px)", backgroundSize: "100% 48px", pointerEvents: "none" }} />
      {/* Margin line */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "22%", width: 1, background: "rgba(220,44,44,.08)", pointerEvents: "none" }} />

      {/* Light ambient */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 70% 50%, rgba(10,122,106,.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%", display: "grid", gridTemplateColumns: "50% 50%", gap: 60, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .5s ease .1s", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(10,122,106,.08)", border: "1px solid rgba(10,122,106,.18)", borderRadius: 100, padding: "7px 16px", marginBottom: 32 }}>
            <span style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--teal)", letterSpacing: ".06em" }}>English & Hindi · 3 Months · All Ages</span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-serif)", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-.01em",
            marginBottom: 16, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(24px)",
            transition: "all .7s cubic-bezier(.4,0,.2,1) .2s",
          }}>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)", color: "var(--ink)", fontStyle: "italic" }}>Precision.</span>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)" }} className="teal-text">Stroke.</span>
            <span style={{ display: "block", fontSize: "clamp(44px,5.5vw,78px)", color: "var(--ink)", fontStyle: "italic" }}>Rhythm.</span>
          </h1>

          <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,var(--teal),transparent)", borderRadius: 2, marginBottom: 24, opacity: loaded ? 1 : 0, transition: "opacity .7s ease .5s" }} />

          <p style={{ fontSize: 17, lineHeight: 1.8, color: "var(--ink2)", maxWidth: 460, marginBottom: 36, fontWeight: 300, opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .7s ease .35s" }}>
            Handwriting is not just penmanship — it's fine motor precision, cognitive rhythm, and the first impression every student makes on every page. In 12 weeks, we rebuild it from the ground up.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .45s" }}>
            <button className="btn-teal">Enroll in Handwriting →</button>
            <button className="btn-outline-light">Book Free Trial</button>
          </div>

          <div style={{ display: "flex", gap: 28, marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(14,13,11,.1)", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .6s" }}>
            {[["12", "Weeks"], ["2", "Languages"], ["All Ages", "Classes 1+"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "var(--ink)" }}>{v}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--ink2)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — writing showcase */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(32px)", transition: "all .9s cubic-bezier(.4,0,.2,1) .3s", position: "relative" }}>
          {/* Main showcase card */}
          <div className="paper" style={{
            borderRadius: 28, padding: "36px", position: "relative", overflow: "hidden",
            border: "1px solid rgba(14,13,11,.1)",
            boxShadow: "0 24px 80px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.06)",
            backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, rgba(10,122,106,.08) 31px, rgba(10,122,106,.08) 32px)",
            backgroundSize: "100% 32px",
          }}>
            {/* Top corner decoration */}
            <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "var(--font-m)", fontSize: 10, color: "rgba(10,122,106,.4)", letterSpacing: ".1em" }}>TALENT HUB · HANDWRITING</div>

            <div style={{ marginBottom: 8 }}>
              <div className="lbl" style={{ marginBottom: 20 }}>Sample Writing Progress</div>
            </div>

            {/* Before sample */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "rgba(14,13,11,.3)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>Before — Week 1</div>
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: "clamp(22px,3vw,32px)", color: "rgba(14,13,11,.25)",
                letterSpacing: "0.12em", lineHeight: 2.2, paddingBottom: 4,
                borderBottom: "1px solid rgba(10,122,106,.1)",
                filter: "blur(0.5px)",
              }}>
                {WRITING_SAMPLES_EN[wordIdx]}
              </div>
            </div>

            {/* Animated divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(10,122,106,.15)" }} />
              <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--teal)", letterSpacing: ".12em", whiteSpace: "nowrap" }}>12 WEEKS LATER →</div>
              <div style={{ flex: 1, height: 1, background: "rgba(10,122,106,.15)" }} />
            </div>

            {/* After sample */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--teal)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>After — Week 12</div>
              <div key={wordIdx} style={{
                fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(26px,3.5vw,40px)", color: "var(--ink)",
                letterSpacing: ".02em", lineHeight: 2.0, paddingBottom: 4,
                borderBottom: "2px solid rgba(10,122,106,.2)",
                animation: "fade-word .4s ease both",
                fontWeight: 600,
              }}>
                {WRITING_SAMPLES_EN[wordIdx]}
              </div>
            </div>

            {/* Hindi sample row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", background: "rgba(10,122,106,.05)", borderRadius: 12, border: "1px solid rgba(10,122,106,.1)" }}>
              <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--teal)", letterSpacing: ".1em", textTransform: "uppercase", writingMode: "vertical-rl", transform: "rotate(180deg)", flexShrink: 0 }}>हिंदी</div>
              <div key={`h${wordIdx}`} style={{
                fontFamily: "var(--font-serif)", fontSize: "clamp(20px,2.5vw,30px)", color: "var(--ink)",
                animation: "fade-word .4s ease .1s both", opacity: 0,
                fontWeight: 600,
              }}>
                {WRITING_SAMPLES_HI[wordIdx]}
              </div>
            </div>
          </div>

          {/* Float badges */}
          <div style={{ position: "absolute", top: -18, right: -18, background: "var(--teal)", borderRadius: 14, padding: "10px 16px", animation: "float-slow 4s ease-in-out infinite", boxShadow: "0 8px 28px rgba(10,122,106,.3)" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "rgba(255,255,255,.7)", letterSpacing: ".1em", textTransform: "uppercase" }}>Duration</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "white" }}>3 Months</div>
          </div>
          <div style={{ position: "absolute", bottom: 60, left: -24, background: "var(--dark2)", backdropFilter: "blur(16px)", border: "1px solid rgba(10,153,128,.2)", borderRadius: 14, padding: "12px 16px", animation: "float-rev 5s ease-in-out infinite 1.2s", boxShadow: "0 8px 28px rgba(0,0,0,.2)" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--teal3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Visible Change</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "white" }}>Within 3 Weeks</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// BILINGUAL TRACKS — DARK SECTION
// ─────────────────────────────────────────
function BilingualTracks() {
  const [track, setTrack] = useState<"english" | "hindi">("english");
  const curriculum = track === "english" ? ENGLISH_CURRICULUM : HINDI_CURRICULUM;

  return (
    <section style={{ padding: "100px 24px", background: "var(--dark)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(10,153,128,.35), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "flex-end", marginBottom: 52 }}>
            <div>
              <div className="lbl-light" style={{ marginBottom: 16 }}>Course Structure</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px,3.5vw,52px)", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.1, color: "white", fontStyle: "italic" }}>
                The <span className="teal-text">12-Week</span><br />Journey
              </h2>
            </div>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, lineHeight: 1.75, fontWeight: 300 }}>
              Both English and Hindi follow the same stroke-first methodology — beginning with formation mechanics, moving through fluency, and ending with calligraphic expression.
            </p>
          </div>
        </FadeIn>

        {/* Track toggle */}
        <FadeIn delay={0.1}>
          <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
            {(["english", "hindi"] as const).map(t => (
              <button key={t} onClick={() => setTrack(t)} style={{
                padding: "14px 28px", borderRadius: 14, border: `1px solid ${track === t ? "rgba(10,153,128,.4)" : "rgba(255,255,255,.08)"}`,
                background: track === t ? "rgba(10,122,106,.15)" : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all .25s ease",
              }}>
                <span style={{ fontSize: 22 }}>{t === "english" ? "Aa" : "अ"}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-d)", fontSize: 15, fontWeight: 700, color: track === t ? "white" : "rgba(255,255,255,.5)" }}>
                    {t === "english" ? "English Track" : "हिंदी ट्रैक"}
                  </div>
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: track === t ? "var(--teal3)" : "rgba(255,255,255,.25)", letterSpacing: ".06em" }}>
                    {t === "english" ? "Roman script · Cursive" : "Devanagari script · Calligraphy"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Timeline */}
        <div key={track} style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 20, top: 0, bottom: 0, width: 1, background: "rgba(10,153,128,.2)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {curriculum.map((item, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div style={{
                  display: "grid", gridTemplateColumns: "180px 1fr", gap: 28,
                  padding: "20px 0 20px 52px", position: "relative",
                  borderBottom: i < curriculum.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none",
                  transition: "all .25s ease",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(10,122,106,.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {/* Dot on timeline */}
                  <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 9, height: 9, borderRadius: "50%", background: i < 2 ? "var(--teal2)" : i < 4 ? "rgba(10,153,128,.5)" : "rgba(10,153,128,.25)", border: "1px solid rgba(10,153,128,.3)", boxShadow: i < 2 ? "0 0 10px rgba(10,153,128,.4)" : "none", transition: "all .2s ease" }} />

                  <div style={{ fontFamily: "var(--font-m)", fontSize: 11, fontWeight: 600, color: "rgba(10,153,128,.7)", letterSpacing: ".06em", paddingTop: 2 }}>{item.week}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>{item.topic}</div>
                    <div style={{ fontFamily: "var(--font-b)", fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.6, fontWeight: 300 }}>{item.detail}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// BEFORE / AFTER SECTION — LIGHT
// ─────────────────────────────────────────
function BeforeAfter() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>Measurable Change</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-.02em", fontStyle: "italic", color: "var(--ink)" }}>
              What Actually <span className="teal-text">Improves</span>
            </h2>
          </div>
        </FadeIn>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 20, padding: "0 20px 12px", borderBottom: "2px solid rgba(14,13,11,.1)" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--ink2)", letterSpacing: ".12em", textTransform: "uppercase" }}>Aspect</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "rgba(14,13,11,.3)", letterSpacing: ".12em", textTransform: "uppercase" }}>Before</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--teal)", letterSpacing: ".12em", textTransform: "uppercase" }}>After 12 Weeks</div>
          </div>

          {BEFORE_AFTER.map((row, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div style={{
                display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 20,
                padding: "18px 20px", background: "var(--surface)", borderRadius: 14,
                border: "1px solid var(--border)", transition: "all .25s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(10,122,106,.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center" }}>{row.label}</div>
                <div style={{ fontSize: 14, color: "rgba(14,13,11,.45)", lineHeight: 1.6, fontStyle: "italic" }}>{row.before}</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
                  <span style={{ color: "var(--teal)", fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                  {row.after}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// OUTCOMES — DARK SECTION
// ─────────────────────────────────────────
function Outcomes() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--dark2)" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(10,153,128,.3), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="lbl-light" style={{ marginBottom: 16 }}>Outcomes</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.1, color: "white", fontStyle: "italic" }}>
                Beyond Better <span className="teal-text">Handwriting</span>
              </h2>
            </div>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 15, maxWidth: 300, lineHeight: 1.7, fontWeight: 300 }}>
              The benefits extend well past the pen — to cognition, confidence, and the way students present themselves academically.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {OUTCOMES.map((o, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="card-dark" style={{ padding: "28px" }}>
                <div style={{ fontSize: 30, marginBottom: 16 }}>{o.icon}</div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, fontStyle: "italic", marginBottom: 10, color: "white", letterSpacing: "-.01em" }}>{o.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,.45)", fontWeight: 300 }}>{o.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// FAQ — LIGHT
// ─────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>Questions</div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3vw,44px)", fontWeight: 700, letterSpacing: "-.02em", fontStyle: "italic", color: "var(--ink)" }}>Answered</h2>
          </div>
        </FadeIn>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQS.map((f, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div style={{ background: open === i ? "var(--surface)" : "transparent", border: `1px solid ${open === i ? "rgba(10,122,106,.22)" : "var(--border)"}`, borderRadius: 16, overflow: "hidden", transition: "all .3s ease" }}>
                <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)", fontStyle: "italic" }}>{f.q}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: open === i ? "rgba(10,122,106,.12)" : "var(--bg2)", border: `1px solid ${open === i ? "rgba(10,122,106,.25)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .25s ease", transform: open === i ? "rotate(45deg)" : "none", color: open === i ? "var(--teal)" : "var(--ink2)", fontSize: 16 }}>+</div>
                </button>
                {open === i && (
                  <div style={{ padding: "0 24px 20px", fontSize: 15, lineHeight: 1.75, color: "var(--ink2)", fontWeight: 300, animation: "reveal .3s ease both" }}>{f.a}</div>
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
// CTA — DARK
// ─────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ padding: "80px 24px", background: "var(--dark)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{
            position: "relative", borderRadius: 28, overflow: "hidden",
            border: "1px solid rgba(10,153,128,.2)", padding: "72px 64px",
            background: "var(--dark2)", boxShadow: "0 40px 100px rgba(0,0,0,.4)",
            backgroundImage: "repeating-linear-gradient(transparent, transparent 47px, rgba(10,122,106,.04) 47px, rgba(10,122,106,.04) 48px)",
            backgroundSize: "100% 48px",
          }}>
            {/* Margin line decoration */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "8%", width: 1, background: "rgba(200,44,44,.1)" }} />

            <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,122,106,.12), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,122,106,.06), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              <div>
                <div className="lbl-light" style={{ marginBottom: 20 }}>English & Hindi Available</div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px,3.5vw,52px)", fontWeight: 700, fontStyle: "italic", letterSpacing: "-.02em", lineHeight: 1.0, marginBottom: 20, color: "white" }}>
                  Write With<br /><span className="teal-text">Confidence.</span>
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,.45)", lineHeight: 1.75, fontWeight: 300 }}>
                  A 12-week course that changes how students feel about putting pen to paper — permanently.
                </p>
              </div>
              <div>
                <div style={{ background: "rgba(10,122,106,.08)", border: "1px solid rgba(10,153,128,.15)", borderRadius: 18, padding: "28px", marginBottom: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[["Aa", "English Track", "Roman script"], ["अ", "Hindi Track", "Devanagari script"]].map(([sym, name, sub]) => (
                      <div key={name} style={{ textAlign: "center", padding: "16px", background: "rgba(10,122,106,.1)", border: "1px solid rgba(10,153,128,.15)", borderRadius: 12 }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "var(--teal3)", marginBottom: 6 }}>{sym}</div>
                        <div style={{ fontFamily: "var(--font-d)", fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>{name}</div>
                        <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: ".06em" }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn-teal">Book Free Session →</button>
                  <button className="btn-outline-dark">📞 Call Us</button>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {["Free trial class", "Both tracks available", "All ages welcome"].map(t => (
                    <span key={t} style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "rgba(10,153,128,.5)", letterSpacing: ".04em" }}>✓ {t}</span>
                  ))}
                </div>
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
    <footer style={{ background: "var(--dark)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 12, color: "white" }}>T</span>
          </div>
          <span style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14, color: "white" }}>Talent Hub Excellence Lab</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Rohini Sec-16", "Rohini Sec-11", "Gurgaon"].map(b => (
            <span key={b} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "rgba(255,255,255,.25)" }}>📍{b}</span>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "rgba(255,255,255,.2)" }}>© 2024 Talent Hub. All rights reserved.</div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────
export default function HandwritingPage() {
  return (
    <>
      <Styles />
      <Nav />
      <main>
        <Hero />
        <BilingualTracks />
        <BeforeAfter />
        <Outcomes />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}