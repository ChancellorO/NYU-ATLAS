import { useEffect, useRef, useState } from "react";

export default function SnoopyLoader({
  durationMs = 3000,  // how long to stay visible
  frameMs = 150,      // frame rate
  fadeMs = 450        // fade-out duration
}) {
  const [phase, setPhase] = useState("show"); // "show" | "closing" | "hidden"
  const [current, setCurrent] = useState(0);

  const frameTimer = useRef(null);
  const closeTimer = useRef(null);
  const fallbackUnmount = useRef(null);

  // public/snoopy/Snoopy1.png ... Snoopy8.png
  const base = import.meta.env.BASE_URL || "/";
  const imageUrls = Array.from({ length: 8 }, (_, i) => `${base}snoopy/Snoopy${i + 1}.png`);
  const total = imageUrls.length;

  // Start showing immediately; schedule closing after durationMs
  useEffect(() => {
    setPhase("show");
    closeTimer.current = setTimeout(() => setPhase("closing"), durationMs);
    return () => clearTimeout(closeTimer.current);
  }, [durationMs]);

  // Frame loop while visible
  useEffect(() => {
    if (phase === "hidden") return;
    clearInterval(frameTimer.current);
    frameTimer.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, frameMs);
    return () => clearInterval(frameTimer.current);
  }, [phase, frameMs, total]);

  // When we start closing, set a fallback unmount (in case transitionend is missed)
  useEffect(() => {
    if (phase !== "closing") return;
    clearTimeout(fallbackUnmount.current);
    fallbackUnmount.current = setTimeout(() => setPhase("hidden"), fadeMs + 100);
    return () => clearTimeout(fallbackUnmount.current);
  }, [phase, fadeMs]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`snoopy-overlay${phase === "closing" ? " closing" : ""}`}
      style={{ "--fadeMs": `${fadeMs}ms` }}
      onTransitionEnd={(e) => {
        // Only unmount when the overlay itself finishes its fade transition
        if (e.target === e.currentTarget && phase === "closing") {
          setPhase("hidden");
        }
      }}
    >
      {/* starfield layers */}
      <div className="stars" aria-hidden="true" />
      <div className="twinkle" aria-hidden="true" />

      <div className="loader">
        <div className="animation-container fade-in">
          <img src={imageUrls[current]} alt="Snoopy loading" className="frame" />
        </div>

        <div className="loading-text">
          <svg className="spinner" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="ring" cx="12" cy="12" r="10" />
            <path className="arc" d="M4 12a8 8 0 018-8V0" />
          </svg>
          <p>Loading mission control…</p>
        </div>
      </div>
    </div>
  );
}
