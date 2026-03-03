/**
 * SuperJourneySection — Rich, premium SUPER badge progression section.
 * Shown at the top of the /rewards page.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSuperJourney } from "../../lib/rewardsApi";
import type { SuperJourneyResponse, SuperMilestone } from "../../types/rewards";

const LETTER_COLORS: Record<string, string> = {
  S: "#f59e0b",
  U: "#f97316",
  P: "#a78bfa",
  E: "#34d399",
  R: "#60a5fa",
};
const LETTERS = ["S", "U", "P", "E", "R"] as const;

function formatPts(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

function MilestoneChip({ m, index }: { m: SuperMilestone; index: number }) {
  const isLetter = m.type === "letter";
  const letter = m.letter ?? "";
  const color = isLetter ? LETTER_COLORS[letter] ?? "#f59e0b" : "#64748b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      title={`${m.label} — ${m.points.toLocaleString()} pts${m.unlocked ? " ✓ Unlocked" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        flex: "0 0 auto",
      }}
    >
      {/* Dot / icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isLetter ? 16 : 18,
          fontWeight: 800,
          fontFamily: "'Playfair Display', Georgia, serif",
          background: m.unlocked
            ? isLetter
              ? `radial-gradient(circle, ${color}44 0%, ${color}22 100%)`
              : "rgba(100,116,139,0.2)"
            : "rgba(255,255,255,0.04)",
          border: m.unlocked
            ? isLetter
              ? `2px solid ${color}88`
              : "2px solid rgba(100,116,139,0.4)"
            : "2px solid rgba(255,255,255,0.07)",
          color: m.unlocked ? (isLetter ? color : "#94a3b8") : "#2d3352",
          boxShadow: m.unlocked && isLetter ? `0 0 16px ${color}55` : "none",
          transition: "all 0.3s",
        }}
      >
        {m.unlocked ? (isLetter ? letter : m.emoji) : isLetter ? "?" : m.emoji}
      </div>
      {/* Points label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: m.unlocked ? "#64748b" : "#2d3352",
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.05em",
        }}
      >
        {formatPts(m.points)}
      </div>
    </motion.div>
  );
}

export default function SuperJourneySection() {
  const [data, setData] = useState<SuperJourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuperJourney()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "rgba(15,10,30,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 13, color: "#475569" }}>Loading SUPER Journey…</div>
      </div>
    );
  }

  if (!data) return null;

  const { milestones, next_milestone, total_points, all_letters_done } = data;

  // Build the 5-letter display
  const letterStatus = LETTERS.map((l) => {
    const m = milestones.find((x) => x.type === "letter" && x.letter === l);
    return { letter: l, unlocked: m?.unlocked ?? false, color: LETTER_COLORS[l] };
  });

  const nextPts = next_milestone?.range_end ?? 30000;
  const progressPct = next_milestone?.pct ?? 100;
  const nextLabel = next_milestone?.label ?? "🎉 Journey Complete!";
  const nextType = next_milestone?.type;

  const accentColor = all_letters_done
    ? "#f59e0b"
    : next_milestone?.type === "letter"
    ? LETTER_COLORS[next_milestone.letter ?? "S"] ?? "#a78bfa"
    : "#7b5ce5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: "linear-gradient(145deg, rgba(12,8,25,0.97) 0%, rgba(18,12,38,0.97) 100%)",
        border: `1px solid ${accentColor}28`,
        borderRadius: 24,
        padding: "28px 28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow blobs */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -20,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(123,92,229,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: `${accentColor}99`,
              textTransform: "uppercase",
              fontFamily: "JetBrains Mono, monospace",
              marginBottom: 4,
            }}
          >
            Your SUPER Journey
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#f1f5f9",
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {all_letters_done ? "🏆 You've gone SUPER!" : "Collect the letters, earn rewards"}
          </h2>
        </div>
        <div
          style={{
            flexShrink: 0,
            background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}11 100%)`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 12,
            padding: "6px 14px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, color: accentColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
            {total_points.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
        </div>
      </div>

      {/* SUPER letters display */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        {letterStatus.map(({ letter, unlocked, color }, i) => (
          <motion.div
            key={letter}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              fontFamily: "'Playfair Display', Georgia, serif",
              background: unlocked
                ? `linear-gradient(145deg, ${color}33 0%, ${color}1a 100%)`
                : "rgba(255,255,255,0.03)",
              border: unlocked ? `2px solid ${color}66` : "2px solid rgba(255,255,255,0.06)",
              color: unlocked ? color : "#1e2540",
              boxShadow: unlocked ? `0 0 20px ${color}44, inset 0 1px 0 ${color}33` : "none",
              transition: "all 0.4s",
              position: "relative",
              userSelect: "none",
            }}
          >
            {unlocked ? letter : "?"}
            {unlocked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: "#000",
                  fontWeight: 900,
                  boxShadow: `0 0 8px ${color}`,
                }}
              >
                ✓
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Milestone timeline strip */}
      <div
        style={{
          overflowX: "auto",
          scrollbarWidth: "none",
          marginBottom: 20,
          paddingBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            minWidth: "max-content",
            padding: "4px 2px",
          }}
        >
          {milestones.map((m, i) => (
            <MilestoneChip key={m.badge_key} m={m} index={i} />
          ))}
        </div>
      </div>

      {/* Progress bar + next milestone */}
      <AnimatePresence mode="wait">
        {next_milestone ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Next reward info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `${accentColor}22`,
                    border: `1px solid ${accentColor}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {nextType === "letter" ? (
                    <span style={{ fontWeight: 900, color: accentColor, fontFamily: "'Playfair Display', serif" }}>
                      {next_milestone.letter}
                    </span>
                  ) : (
                    next_milestone.emoji
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                    Next: {nextLabel}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    {next_milestone.points_needed.toLocaleString()} pts to go
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
                {total_points.toLocaleString()} / {nextPts.toLocaleString()}
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${accentColor}cc 0%, ${accentColor} 100%)`,
                  boxShadow: `0 0 10px ${accentColor}88`,
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>
                {next_milestone.range_start.toLocaleString()} pts
              </span>
              <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                {progressPct}%
              </span>
              <span style={{ fontSize: 10, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>
                {nextPts.toLocaleString()} pts
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(251,191,36,0.08) 100%)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: 14,
              padding: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28 }}>🏆</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginTop: 6 }}>
              Journey Complete!
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              You've unlocked every milestone in the SUPER journey. Legendary!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
