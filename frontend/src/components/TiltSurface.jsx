import { useRef } from "react";
import "./TiltSurface.css";

export default function TiltSurface({
  children,
  className = "",
  maxTilt = 6,
  glare = true,
}) {
  const ref = useRef(null);

  function handlePointerMove(event) {
    const node = ref.current;
    if (!node) return;

    const bounds = node.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width;
    const py = (event.clientY - bounds.top) / bounds.height;
    const rotateY = (px - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - py) * maxTilt * 2;

    node.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
    node.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    node.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
  }

  function resetTilt() {
    const node = ref.current;
    if (!node) return;

    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--glare-x", "50%");
    node.style.setProperty("--glare-y", "50%");
  }

  return (
    <div
      ref={ref}
      className={`tilt-surface ${glare ? "tilt-surface--glare" : ""} ${className}`.trim()}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      {children}
    </div>
  );
}
