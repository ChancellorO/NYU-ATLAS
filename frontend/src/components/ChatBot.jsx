import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Image } from "@chakra-ui/react";

const base = import.meta.env.BASE_URL || "/";
const imageUrl = `${base}snoopy/snoopyChatBot2.png`;

/** Tiny Markdown renderer for **bold**, *italic*, `code`, and newlines */
function mdLite(src = "") {
  // escape HTML first
  let s = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // bold then italic
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // paragraphs / line breaks
  s = s.replace(/\r\n|\r|\n/g, "<br/>");
  return s;
}

export const Chatbot = forwardRef(function Chatbot(
  {
    avatarSrc = imageUrl,
    sound = true,
  },
  ref
) {
  const [bubbleText, setBubbleText] = useState("");
  const [visible, setVisible] = useState(false);

  const bubbleRef = useRef(null);
  const toggleRef = useRef(null);

  useImperativeHandle(ref, () => ({
    notify(text) {
      setBubbleText(text);
      setVisible(true);
      if (sound) playChime();
    },
    dismiss() {
      setVisible(false);
    },
  }));

  // close when clicking anywhere outside the bubble or avatar
  useEffect(() => {
    function handleClickOutside(e) {
      if (!visible) return;
      const b = bubbleRef.current;
      const t = toggleRef.current;
      if (b && !b.contains(e.target) && t && !t.contains(e.target)) {
        setVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible]);

  function playChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch { /* ignore autoplay issues */ }
  }

  return (
    <div className="chatbot">
      {/* Floating toggle button (idle mascot) */}
      <button
        ref={toggleRef}
        className="chatbot-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-expanded={visible}
        aria-controls="chatbot-bubble"
        title={visible ? "Hide message" : "Show message"}
      >
        <Image height="80px" borderRadius="full" alt="Chatbot" src={avatarSrc} />
      </button>

      {/* Chat bubble */}
      {visible && bubbleText && (
        <div id="chatbot-bubble" ref={bubbleRef} className="chatbot-bubble" role="dialog" aria-live="polite">
          <div
            className="bubble-content"
            /* render formatted message */
            dangerouslySetInnerHTML={{ __html: mdLite(bubbleText) }}
          />
          <button className="bubble-close" aria-label="Dismiss" onClick={() => setVisible(false)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
});
