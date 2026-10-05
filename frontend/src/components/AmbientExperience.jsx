import { useEffect, useState } from "react";
import "./AmbientExperience.css";

export default function AmbientExperience() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateProgress() {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const next =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;
      setProgress(next);
    }

    function updatePointer(event) {
      document.documentElement.style.setProperty(
        "--ambient-pointer-x",
        `${event.clientX}px`
      );
      document.documentElement.style.setProperty(
        "--ambient-pointer-y",
        `${event.clientY}px`
      );
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  return (
    <>
      <div className="ambient-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="ambient-cursor-glow" aria-hidden="true" />
      <div className="ambient-noise" aria-hidden="true" />
    </>
  );
}
