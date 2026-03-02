import { useState, useEffect, useRef } from "react";

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
function FadeIn({ children, delay = 0, dir = "up", style = {} }: {
  children: React.ReactNode; delay?: number; dir?: "up"|"left"|"right"|"none"; style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView();
  const offsets: Record<string, string> = { up: "translateY(28px)", left: "translateX(-28px)", right: "translateX(28px)", none: "none" };
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : offsets[dir],
      transition: `opacity .65s cubic-bezier(.4,0,.2,1) ${delay}s, transform .65s cubic-bezier(.4,0,.2,1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:      #07060A;
      --bg2:     #0C0B12;
      --surface: #111018;
      --s2:      #161523;
      --border:  rgba(255,255,255,0.06);
      --b2:      rgba(255,255,255,0.09);
      --o:       #E05C28;
      --o2:      #F07840;
      --o3:      #FFAB7A;
      --oglow:   rgba(224,92,40,0.22);
      --odim:    rgba(224,92,40,0.1);
      --white:   #F5F0FF;
      --white2:  #B0AACC;
      --muted:   #524E68;
      --teal:    #00D9C0;
      --p:       #7B5CE5;
      --font-d:  'Syne', sans-serif;
      --font-b:  'DM Sans', sans-serif;
      --font-m:  'JetBrains Mono', monospace;
    }

    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--white); font-family: var(--font-b); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    ::selection { background: var(--oglow); }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: var(--o); border-radius: 2px; }

    @keyframes float-slow  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes scanline    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
    @keyframes glow-pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
    @keyframes circuit     { 0%{stroke-dashoffset:200} 100%{stroke-dashoffset:0} }
    @keyframes orbit       { 0%{transform:rotate(0deg) translateX(60px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(60px) rotate(-360deg)} }
    @keyframes blink-c     { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes slide-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
    @keyframes boot-bar    { from{width:0} to{width:100%} }
    @keyframes marquee     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

    .orange-text {
      background: linear-gradient(135deg, var(--o2) 0%, var(--o3) 40%, var(--o) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .teal-text {
      background: linear-gradient(135deg, var(--teal) 0%, #80EEE0 50%, var(--teal) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .scan-text {
      background: linear-gradient(90deg, var(--white2) 0%, var(--white) 25%, var(--o3) 50%, var(--white) 75%, var(--white2) 100%);
      background-size: 400% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer-bg 5s linear infinite;
    }
    @keyframes shimmer-bg { 0%{background-position:-400% center} 100%{background-position:400% center} }

    .lbl {
      font-family: var(--font-m); font-size: 10px; font-weight: 600;
      letter-spacing: .16em; text-transform: uppercase; color: var(--o2);
      display: inline-flex; align-items: center; gap: 8px;
    }
    .lbl::before { content:''; display:block; width:18px; height:1px; background:var(--o2); }

    .btn-o {
      background: linear-gradient(135deg, var(--o), #b83e10);
      color: #fff; border: none; padding: 13px 26px; border-radius: 10px;
      font-family: var(--font-b); font-size: 15px; font-weight: 600;
      cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease; white-space: nowrap; position: relative; overflow: hidden;
    }
    .btn-o::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.12),transparent); opacity:0; transition: opacity .25s; }
    .btn-o:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(224,92,40,.45); }
    .btn-o:hover::after { opacity: 1; }

    .btn-s {
      background: transparent; color: var(--white2); border: 1px solid var(--b2);
      padding: 13px 24px; border-radius: 10px; font-family: var(--font-b); font-size: 15px;
      font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all .25s ease;
    }
    .btn-s:hover { border-color: rgba(224,92,40,.5); background: rgba(224,92,40,.08); color: var(--white); transform: translateY(-2px); }

    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    .card:hover { border-color: rgba(224,92,40,.3); transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,.35), 0 0 30px rgba(224,92,40,.07); }

    /* Scanline overlay */
    .scanlines::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.04) 2px, rgba(0,0,0,.04) 4px);
    }
  `}</style>
);

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const COURSES = [
  {
    code: "SHUNYA",
    level: "01",
    name: "Paper Circuits",
    tagline: "Light up your mind",
    ages: "4–7 Years",
    duration: "8 Weeks",
    category: "Electronics",
    desc: "Discover the magic of electricity through hands-on paper circuit projects. Create glowing artwork, interactive cards, and learn fundamental electronics concepts using conductive tape, LEDs, and creativity.",
    outcomes: ["Basic electrical concepts", "Hands-on confidence", "Creative problem-solving", "Circuit design basics"],
    learn: ["LED basics & circuit fundamentals", "Conductive tape mastery", "Parallel and series circuits", "Interactive greeting cards"],
    color: "#00D9C0",
    accentDim: "rgba(0,217,192,0.1)",
    accentBorder: "rgba(0,217,192,0.25)",
    icon: "⚡",
  },
  {
    code: "CHAKRA",
    level: "02",
    name: "Robotics Foundations",
    tagline: "Command robots that build the future",
    ages: "8–11 Years",
    duration: "8 Weeks",
    category: "Robotics",
    desc: "Enter the world of robotics by building and programming your own robots. Learn to make machines move, sense, and respond. From basic motors to complex behaviors — become a robot master.",
    outcomes: ["Mechanical construction", "Programming logic", "Sensors & actuators", "Computational thinking"],
    learn: ["Build custom robot chassis", "Motor control & movement", "Sensor integration (ultrasonic, IR)", "Block-based coding (Scratch/Blockly)"],
    color: "#E05C28",
    accentDim: "rgba(224,92,40,0.1)",
    accentBorder: "rgba(224,92,40,0.28)",
    icon: "🤖",
  },
  {
    code: "YANTRA",
    level: "03",
    name: "Internet of Things",
    tagline: "Connect the world through smart devices",
    ages: "12–14 Years",
    duration: "12 Weeks",
    category: "IoT",
    desc: "Build smart connected devices that communicate with each other. Learn how everyday objects become intelligent through sensors, microcontrollers, and internet connectivity.",
    outcomes: ["IoT architecture", "Microcontroller programming", "APIs & cloud services", "Real-world solutions"],
    learn: ["ESP32/NodeMCU programming", "Sensor networks (temp, humidity, motion)", "Cloud connectivity (ThingSpeak, Blynk)", "Smart home automation projects"],
    color: "#7B5CE5",
    accentDim: "rgba(123,92,229,0.1)",
    accentBorder: "rgba(123,92,229,0.28)",
    icon: "🌐",
  },
  {
    code: "ANANTA",
    level: "04",
    name: "Advanced IoT & AI",
    tagline: "Master edge computing & machine learning",
    ages: "14–16 Years",
    duration: "12 Weeks",
    category: "Advanced IoT",
    desc: "Take IoT to the next level with machine learning, edge computing, and advanced sensor fusion. Build sophisticated systems that can learn, predict, and make intelligent decisions autonomously.",
    outcomes: ["ML models on edge devices", "Advanced programming", "Data security", "Production-ready systems"],
    learn: ["Edge computing with Raspberry Pi", "ML model deployment", "Computer vision applications", "MQTT & industrial protocols"],
    color: "#F59E0B",
    accentDim: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.28)",
    icon: "🧠",
  },
  {
    code: "GARUDA",
    level: "05",
    name: "Drone Engineering",
    tagline: "Soar to new heights",
    ages: "14–18 Years",
    duration: "8 Weeks",
    category: "Aerospace",
    desc: "Design, build, and fly autonomous drones. Learn aerodynamics, flight controllers, GPS navigation, and aerial photography. From manual control to fully autonomous missions.",
    outcomes: ["Flight dynamics", "Drone programming", "Autonomous missions", "Commercial certifications"],
    learn: ["Drone construction & assembly", "Flight controller programming", "GPS waypoint navigation", "FPV flying & aerial photography"],
    color: "#EF4444",
    accentDim: "rgba(239,68,68,0.1)",
    accentBorder: "rgba(239,68,68,0.28)",
    icon: "🚁",
  },
];

const DIFFERENTIATORS = [
  { icon: "🔧", title: "100% Hands-On", desc: "Every session is project-based. Students build real working devices — no theoretical lectures, no worksheets." },
  { icon: "📈", title: "Progressive Curriculum", desc: "5 levels, each unlocking new complexity. Paper circuits → robotics → IoT → AI → drones. Nothing is skipped." },
  { icon: "🏗", title: "Real Project Showcase", desc: "Each course ends with a showcase where students present their final project. Parents see the result in action." },
  { icon: "🎓", title: "Industry Exposure", desc: "Robotics competitions, drone demonstrations, IoT hackathons — students encounter the real world early." },
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
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      backdropFilter: scrolled ? "blur(24px)" : "none",
      background: scrolled ? "rgba(7,6,10,.92)" : "transparent",
      transition: "all .3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Talent Hub logo */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 14, color: "white" }}>T</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, color: "var(--white)", letterSpacing: "-.02em" }}>Talent Hub</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 8, color: "var(--muted)", letterSpacing: ".14em", textTransform: "uppercase" }}>Excellence Lab</div>
          </div>
        </a>

        {/* Black Monkey brand pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(224,92,40,.1)", border: "1px solid rgba(224,92,40,.2)",
          borderRadius: 100, padding: "6px 14px",
        }}>
          <span style={{ fontSize: 14 }}>🐒</span>
          <span style={{ fontFamily: "var(--font-m)", fontSize: 11, fontWeight: 700, color: "var(--o2)", letterSpacing: ".06em" }}>BLACK MONKEY</span>
          <span style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--muted)", letterSpacing: ".06em" }}>× TALENT HUB</span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-s" style={{ padding: "9px 18px", fontSize: 14 }}>← Back to Talent Hub</button>
          <button className="btn-o" style={{ padding: "9px 18px", fontSize: 14 }}>Visit blackmonkey.in ↗</button>
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
  const [tick, setTick] = useState(0);
  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);
  useEffect(() => { const t = setInterval(() => setTick(n => (n + 1) % 4), 2500); return () => clearInterval(t); }, []);

  const BOOT_LINES = [
    "> initializing BLACK MONKEY OS v2.0...",
    "> loading STEM curriculum engine...",
    "> calibrating 5 course pathways...",
    "> system ready. engineers welcome.",
  ];

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 68 }}>
      {/* Deep space bg */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 30% 50%, rgba(224,92,40,.07) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 80% 30%, rgba(0,217,192,.04) 0%, transparent 60%)" }} />

      {/* Circuit-board grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: .35,
        backgroundImage: "linear-gradient(rgba(224,92,40,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(224,92,40,.08) 1px,transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%)",
      }} />

      {/* Scanline */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity: .03 }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, transparent, rgba(224,92,40,.8), transparent)", animation: "scanline 8s linear infinite" }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%", display: "grid", gridTemplateColumns: "55% 45%", gap: 60, alignItems: "center" }}>
        {/* Left */}
        <div>
          {/* Boot sequence terminal */}
          <div style={{
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)",
            transition: "all .5s ease .1s",
            display: "inline-flex", flexDirection: "column", gap: 4,
            background: "rgba(0,0,0,.5)", border: "1px solid rgba(224,92,40,.2)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 32,
            fontFamily: "var(--font-m)", fontSize: 11, color: "var(--o3)",
            letterSpacing: ".04em", minWidth: 340,
          }}>
            {BOOT_LINES.slice(0, tick + 1).map((line, i) => (
              <div key={i} style={{ opacity: i === tick ? 1 : 0.45, animation: i === tick ? "slide-up .3s ease both" : "none" }}>
                {line}
                {i === tick && <span style={{ animation: "blink-c 1s infinite" }}>▊</span>}
              </div>
            ))}
          </div>

          <h1 style={{
            fontFamily: "var(--font-d)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-.04em",
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(24px)", transition: "all .7s cubic-bezier(.4,0,.2,1) .2s",
            marginBottom: 12,
          }}>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)", color: "var(--white)" }}>Built For</span>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)" }} className="orange-text">The Creators</span>
            <span style={{ display: "block", fontSize: "clamp(48px,5.5vw,80px)", color: "var(--white)" }}>of Tomorrow.</span>
          </h1>

          <div style={{ width: 60, height: 3, background: "linear-gradient(90deg,var(--o),transparent)", borderRadius: 2, marginBottom: 24, opacity: loaded ? 1 : 0, transition: "opacity .7s ease .5s" }} />

          <p style={{
            fontSize: 17, lineHeight: 1.75, color: "var(--white2)", maxWidth: 460, marginBottom: 36,
            opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(16px)", transition: "all .7s ease .35s",
          }}>
            Robotics, IoT, AI, and aerospace engineering — unlocked for ages 4 to 18. Five progressive courses under the Black Monkey brand, available at Talent Hub. Where engineers are made, not born.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .45s" }}>
            <button className="btn-o">Explore All Courses →</button>
            <button className="btn-s">Visit blackmonkey.in ↗</button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 28, marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--border)", opacity: loaded ? 1 : 0, transition: "opacity .7s ease .6s" }}>
            {[["5", "Courses"], ["4–18", "Age Range"], ["8–12 Wk", "Per Course"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 26, fontWeight: 800, letterSpacing: "-.04em", color: "var(--white)" }}>{v}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Course orbit / visual */}
        <div style={{
          opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateX(32px)",
          transition: "all .9s cubic-bezier(.4,0,.2,1) .3s",
          position: "relative",
        }}>
          <div style={{
            background: "linear-gradient(145deg, var(--s2), var(--bg2))",
            border: "1px solid var(--b2)", borderRadius: 28,
            padding: "32px", position: "relative", overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0,0,0,.6), 0 0 60px rgba(224,92,40,.08)",
          }}>
            {/* Scanlines */}
            <div className="scanlines" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

            {/* Glow */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,92,40,.15), transparent 70%)", pointerEvents: "none" }} />

            <div className="lbl" style={{ marginBottom: 20 }}>Mission Control — 5 Pathways</div>

            {/* Course level stack */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COURSES.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)",
                  transition: "all .25s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${c.accentDim}`; (e.currentTarget as HTMLElement).style.borderColor = `${c.accentBorder}`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.05)"; }}
                >
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".1em", minWidth: 24 }}>L{c.level}</div>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.accentDim}`, border: `1px solid ${c.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{c.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-m)", fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: ".1em", textTransform: "uppercase" }}>{c.code}</div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "var(--white)", lineHeight: 1.2 }}>{c.name}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", textAlign: "right" }}>
                    <div>{c.ages}</div>
                    <div>{c.duration}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar boot effect */}
            <div style={{ marginTop: 20, background: "rgba(255,255,255,.04)", borderRadius: 6, height: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, var(--o), var(--teal))", borderRadius: 6, animation: "boot-bar 2s ease .5s both" }} />
            </div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginTop: 6, letterSpacing: ".08em" }}>
              5/5 PATHWAYS LOADED · SYSTEM ACTIVE
            </div>
          </div>

          {/* Float badges */}
          <div style={{
            position: "absolute", top: -18, right: -18,
            background: "linear-gradient(135deg, #0C2A26, #0a1f1d)",
            border: "1px solid rgba(0,217,192,.3)", borderRadius: 14, padding: "10px 16px",
            fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 13, color: "var(--teal)",
            boxShadow: "0 8px 28px rgba(0,0,0,.5)",
            animation: "float-slow 4.5s ease-in-out infinite",
          }}>
            🐒 Black Monkey
          </div>

          <div style={{
            position: "absolute", bottom: 60, left: -24,
            background: "rgba(7,6,10,.95)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(224,92,40,.2)", borderRadius: 14, padding: "12px 16px",
            animation: "float-slow 5.5s ease-in-out infinite 1.5s",
            boxShadow: "0 8px 28px rgba(0,0,0,.5)",
          }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: 9, color: "var(--o2)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Also Available At</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "white" }}>blackmonkey.in ↗</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// COURSE DETAIL CARDS
// ─────────────────────────────────────────────
function CourseDetails() {
  const [active, setActive] = useState(1); // default CHAKRA

  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(224,92,40,.35), transparent)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ marginBottom: 48 }}>
            <div className="lbl" style={{ marginBottom: 16 }}>The 5 Pathways</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: 16 }}>
              From Sparks to <span className="orange-text">Soaring Drones</span>
            </h2>
            <p style={{ color: "var(--white2)", fontSize: 16, maxWidth: 520, lineHeight: 1.7 }}>
              Each course is a self-contained progression. Students can join at any level appropriate for their age — or start from Shunya and grow through the full stack.
            </p>
          </div>
        </FadeIn>

        {/* Top tabs */}
        <FadeIn delay={0.1}>
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {COURSES.map((c, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                padding: "10px 18px", borderRadius: 10, border: `1px solid ${active === i ? c.accentBorder : "var(--border)"}`,
                background: active === i ? c.accentDim : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .25s ease",
              }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontFamily: "var(--font-m)", fontSize: 11, fontWeight: 700, color: active === i ? c.color : "var(--muted)", letterSpacing: ".08em" }}>{c.code}</span>
                <span style={{ fontFamily: "var(--font-b)", fontSize: 13, color: active === i ? "var(--white)" : "var(--muted)" }}>{c.name}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Detail panel */}
        <div key={active} style={{ animation: "slide-up .35s ease both", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Main info */}
          <div style={{
            background: "var(--surface)", borderRadius: 24, padding: "36px",
            border: `1px solid ${COURSES[active].accentBorder}`,
            position: "relative", overflow: "hidden",
            boxShadow: `0 0 60px ${COURSES[active].accentDim}`,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${COURSES[active].color}, transparent)` }} />
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${COURSES[active].accentDim}, transparent 70%)`, pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, fontSize: 26,
                background: `${COURSES[active].accentDim}`, border: `1px solid ${COURSES[active].accentBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{COURSES[active].icon}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: "var(--font-m)", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: COURSES[active].color,
                    background: `${COURSES[active].accentDim}`, border: `1px solid ${COURSES[active].accentBorder}`,
                    borderRadius: 6, padding: "3px 8px",
                  }}>{COURSES[active].code} · LEVEL {COURSES[active].level}</span>
                  <span style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", letterSpacing: ".08em" }}>{COURSES[active].category}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(22px,2.5vw,30px)", fontWeight: 800, letterSpacing: "-.03em", color: "var(--white)", lineHeight: 1.1 }}>{COURSES[active].name}</h3>
                <p style={{ fontFamily: "var(--font-b)", fontSize: 14, color: COURSES[active].color, marginTop: 4, opacity: .9 }}>{COURSES[active].tagline}</p>
              </div>
            </div>

            {/* Meta pills */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[`🎯 ${COURSES[active].ages}`, `⏱ ${COURSES[active].duration}`].map(p => (
                <div key={p} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontFamily: "var(--font-m)", fontSize: 12, color: "var(--white2)" }}>{p}</div>
              ))}
            </div>

            <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--white2)" }}>{COURSES[active].desc}</p>

            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn-o" style={{ background: `linear-gradient(135deg, ${COURSES[active].color}, ${COURSES[active].color}aa)` }}>
                Enroll in {COURSES[active].code} →
              </button>
              <button className="btn-s">Full Details ↗</button>
            </div>
          </div>

          {/* What you learn */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: "28px", flex: 1 }}>
              <div className="lbl" style={{ color: COURSES[active].color, marginBottom: 16 }}>What You'll Learn</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {COURSES[active].learn.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: COURSES[active].color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "var(--white2)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: "24px" }}>
              <div className="lbl" style={{ color: COURSES[active].color, marginBottom: 14 }}>Key Outcomes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {COURSES[active].outcomes.map((o, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--white2)" }}>
                    <span style={{ color: COURSES[active].color, fontSize: 11 }}>✓</span> {o}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All 5 mini cards */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
          {COURSES.map((c, i) => (
            <FadeIn key={i} delay={i * 0.07}>
              <div onClick={() => setActive(i)} style={{
                background: active === i ? c.accentDim : "var(--surface)",
                border: `1px solid ${active === i ? c.accentBorder : "var(--border)"}`,
                borderRadius: 16, padding: "20px 16px", textAlign: "center",
                cursor: "pointer", transition: "all .25s ease",
                boxShadow: active === i ? `0 0 30px ${c.accentDim}` : "none",
              }}
              onMouseEnter={e => { if (active !== i) { (e.currentTarget as HTMLElement).style.borderColor = c.accentBorder; (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; } }}
              onMouseLeave={e => { if (active !== i) { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "none"; } }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: ".12em", marginBottom: 4 }}>{c.code}</div>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 13, fontWeight: 700, color: active === i ? "var(--white)" : "var(--white2)", lineHeight: 1.2 }}>{c.name}</div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginTop: 6 }}>{c.ages}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// WHY SECTION
// ─────────────────────────────────────────────
function Why() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 16 }}>Why Black Monkey</div>
              <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(30px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.1 }}>
                Engineering Education,<br /><span className="orange-text">Done Right.</span>
              </h2>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 300, lineHeight: 1.65 }}>
              Not another coding class. A full-stack engineer's education, built for children from the ground up.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {DIFFERENTIATORS.map((d, i) => (
            <FadeIn key={i} delay={i * 0.1} dir={i % 2 === 0 ? "left" : "right"}>
              <div className="card" style={{ padding: "32px", display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(224,92,40,.1)", border: "1px solid rgba(224,92,40,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                  {d.icon}
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-d)", fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 10, color: "var(--white)" }}>{d.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--white2)" }}>{d.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// PATHWAY PROGRESSION
// ─────────────────────────────────────────────
function Pathway() {
  return (
    <section style={{ padding: "100px 24px", background: "var(--bg2)" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "50%", height: 1, background: "linear-gradient(90deg, transparent, rgba(224,92,40,.3), transparent)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="lbl" style={{ justifyContent: "center", marginBottom: 16 }}>The Full Path</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(30px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em" }}>
              Age 4 to Age 18 —<br /><span className="orange-text">One Complete Journey</span>
            </h2>
          </div>
        </FadeIn>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Connecting line */}
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, var(--teal), var(--o2), var(--p), var(--gold), #EF4444)",
            opacity: .25, pointerEvents: "none",
          }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, position: "relative" }}>
            {COURSES.map((c, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--muted)", marginBottom: 12, letterSpacing: ".1em" }}>{c.ages}</div>
                  <div style={{
                    width: 56, height: 56, borderRadius: 18, fontSize: 24, marginBottom: 12,
                    background: `${c.accentDim}`, border: `1px solid ${c.accentBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 20px ${c.accentDim}`, position: "relative", zIndex: 1,
                    transition: "transform .2s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "none"}
                  >{c.icon}</div>
                  <div style={{ fontFamily: "var(--font-m)", fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: ".12em", marginBottom: 4 }}>{c.code}</div>
                  <div style={{ fontFamily: "var(--font-d)", fontSize: 14, fontWeight: 700, color: "var(--white)", lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontFamily: "var(--font-b)", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.duration}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 20 }}>
              Students can join at any level appropriate for their age. Full pathways available at{" "}
              <span style={{ color: "var(--o2)", fontWeight: 600 }}>blackmonkey.in</span>
            </p>
            <button className="btn-o">Visit blackmonkey.in for Full Details ↗</button>
          </div>
        </FadeIn>
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
            background: "linear-gradient(135deg, #1a0e06 0%, #0e0905 50%, #07060A 100%)",
            border: "1px solid rgba(224,92,40,.25)", padding: "72px 64px",
            boxShadow: "0 40px 100px rgba(0,0,0,.5)",
          }}>
            {/* Scanlines */}
            <div className="scanlines" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(224,92,40,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(224,92,40,.04) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
            <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,92,40,.2), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,217,192,.08), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "var(--font-m)", fontSize: 10, color: "var(--o2)", letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 16 }}>🐒 Available At Talent Hub</div>
                <h2 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.0, marginBottom: 20, color: "white" }}>
                  Start Building<br /><span className="orange-text">The Future Today.</span>
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,.55)", lineHeight: 1.7 }}>
                  STEM courses by Black Monkey are available at all three Talent Hub branches. Walk in, try a demo, and let your child discover what they're capable of building.
                </p>
              </div>
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {["Free demo session at any branch", "Age-appropriate course placement", "Full kit provided on enrollment", "Join any batch — flexible timings"].map(t => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,.65)" }}>
                      <span style={{ color: "var(--o2)", fontSize: 12 }}>✓</span> {t}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn-o">Book Free Demo →</button>
                  <button style={{
                    background: "transparent", color: "var(--o3)", border: "1px solid rgba(224,92,40,.3)",
                    padding: "13px 22px", borderRadius: 10, fontFamily: "var(--font-b)", fontSize: 14, fontWeight: 600,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                    transition: "all .25s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(224,92,40,.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,92,40,.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,92,40,.3)"; }}
                  >
                    Visit blackmonkey.in ↗
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7B5CE5,#4F35B8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-d)", fontWeight: 800, fontSize: 12, color: "white" }}>T</span>
            </div>
            <span style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 13, color: "var(--white)" }}>Talent Hub</span>
          </div>
          <span style={{ color: "var(--muted)" }}>×</span>
          <span style={{ fontFamily: "var(--font-m)", fontSize: 12, fontWeight: 700, color: "var(--o2)", letterSpacing: ".08em" }}>🐒 BLACK MONKEY</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Rohini Sec-16", "Rohini Sec-11", "Gurgaon"].map(b => (
            <span key={b} style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>📍{b}</span>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-m)", fontSize: 11, color: "var(--muted)" }}>© 2024 Talent Hub × Black Monkey.</div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function STEMPage() {
  return (
    <>
      <Styles />
      <Nav />
      <main>
        <Hero />
        <CourseDetails />
        <Why />
        <Pathway />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}