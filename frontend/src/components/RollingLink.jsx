import { Link } from "react-router-dom";
import "./RollingLink.css";

// Interacción propia inspirada en el patrón “Text roll navigation” de Skiper UI.
// No incluye código de Skiper UI y no añade dependencias al proyecto.
export default function RollingLink({
  to,
  children,
  variant = "light",
  className = "",
}) {
  return (
    <Link
      to={to}
      className={`rolling-link rolling-link--${variant} ${className}`.trim()}
    >
      <span className="rolling-link-window" aria-hidden="true">
        <span className="rolling-link-track">
          <span>{children}</span>
          <span>{children}</span>
        </span>
      </span>

      <span className="sr-only">{children}</span>

      <span className="rolling-link-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}
