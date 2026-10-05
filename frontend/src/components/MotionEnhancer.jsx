import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./MotionEnhancer.css";

const REVEAL_SELECTORS = [
  ".hotel-hero-text",
  ".hotel-story-content",
  ".hotel-video-frame",
  ".hotel-service-item",
  ".hotel-gallery-heading",
  ".experience-collage",
  ".hotel-testimonial",
  ".hotel-extra-card",
  ".hotel-cta-card",
  ".hotel-section-header",
  ".category-card",
  ".room-detail-intro",
  ".room-detail-facts",
  ".room-detail-media",
  ".room-detail-summary",
  ".room-detail-gallery-panel",
  ".room-detail-info-panel",
  ".room-detail-booking-card",
  ".gallery-section-header",
  ".gallery-video-card",
  ".gallery-card",
  ".booking-header",
  ".booking-form-card",
  ".booking-summary-card",
  ".booking-section",
  ".payment-result-header",
  ".payment-progress",
  ".payment-action-card",
  ".payment-result-summary",
  ".payment-flow-step",
  "#inicio-turismo > section",
  "#inicio-turismo section[id]",
];

const TILT_SELECTORS = [
  ".category-card",
  ".hotel-extra-card",
  ".room-detail-media",
  ".room-detail-summary",
  ".room-detail-booking-card",
  ".gallery-card",
  ".gallery-video-card",
  ".booking-summary-card",
  ".payment-result-summary",
];

const HERO_SELECTORS = [
  ".hotel-hero",
  ".gallery-hero",
];

function uniqueNodes(selectorList) {
  const nodes = selectorList.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
  );

  return Array.from(new Set(nodes));
}

export default function MotionEnhancer() {
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    root.classList.add("motion-enhanced");

    let revealObserver = null;
    let mutationFrame = null;
    const cleanups = [];

    if (!reduceMotion && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.dataset.motionVisible = "true";
            revealObserver?.unobserve(entry.target);
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -7% 0px",
        }
      );
    }

    function bindRevealNodes() {
      uniqueNodes(REVEAL_SELECTORS).forEach((node, index) => {
        if (node.dataset.motionRevealBound === "true") return;

        node.dataset.motionRevealBound = "true";
        node.dataset.motionReveal = "true";
        node.style.setProperty(
          "--motion-delay",
          `${Math.min((index % 5) * 55, 220)}ms`
        );

        if (reduceMotion || !revealObserver) {
          node.dataset.motionVisible = "true";
          return;
        }

        revealObserver.observe(node);
      });
    }

    function bindTiltNodes() {
      if (reduceMotion) return;

      uniqueNodes(TILT_SELECTORS).forEach((node) => {
        if (node.dataset.motionTiltBound === "true") return;

        node.dataset.motionTiltBound = "true";
        node.dataset.motionTilt = "true";

        const handlePointerMove = (event) => {
          if (event.pointerType === "touch") return;

          const bounds = node.getBoundingClientRect();
          const px = (event.clientX - bounds.left) / bounds.width;
          const py = (event.clientY - bounds.top) / bounds.height;

          const rotateY = (px - 0.5) * 5.5;
          const rotateX = (0.5 - py) * 5.5;

          node.style.setProperty(
            "--motion-rotate-x",
            `${rotateX.toFixed(2)}deg`
          );
          node.style.setProperty(
            "--motion-rotate-y",
            `${rotateY.toFixed(2)}deg`
          );
          node.style.setProperty(
            "--motion-glow-x",
            `${(px * 100).toFixed(1)}%`
          );
          node.style.setProperty(
            "--motion-glow-y",
            `${(py * 100).toFixed(1)}%`
          );
        };

        const resetPointer = () => {
          node.style.setProperty("--motion-rotate-x", "0deg");
          node.style.setProperty("--motion-rotate-y", "0deg");
          node.style.setProperty("--motion-glow-x", "50%");
          node.style.setProperty("--motion-glow-y", "50%");
        };

        node.addEventListener("pointermove", handlePointerMove, {
          passive: true,
        });
        node.addEventListener("pointerleave", resetPointer);

        cleanups.push(() => {
          node.removeEventListener("pointermove", handlePointerMove);
          node.removeEventListener("pointerleave", resetPointer);
        });
      });
    }

    function bindHeroNodes() {
      if (reduceMotion) return;

      uniqueNodes(HERO_SELECTORS).forEach((node) => {
        if (node.dataset.motionHeroBound === "true") return;

        node.dataset.motionHeroBound = "true";
        node.dataset.motionHero = "true";

        const handlePointerMove = (event) => {
          if (event.pointerType === "touch") return;

          const bounds = node.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 100;
          const y = ((event.clientY - bounds.top) / bounds.height) * 100;

          node.style.setProperty("--motion-pointer-x", `${x.toFixed(1)}%`);
          node.style.setProperty("--motion-pointer-y", `${y.toFixed(1)}%`);
        };

        node.addEventListener("pointermove", handlePointerMove, {
          passive: true,
        });

        cleanups.push(() => {
          node.removeEventListener("pointermove", handlePointerMove);
        });
      });
    }

    function applyEnhancements() {
      bindRevealNodes();
      bindTiltNodes();
      bindHeroNodes();
    }

    function updatePageMotion() {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollHeight > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollHeight))
          : 0;

      root.style.setProperty("--motion-scroll-progress", String(progress));
      root.dataset.motionScrolled = window.scrollY > 18 ? "true" : "false";
    }

    function updateAmbientPointer(event) {
      if (reduceMotion || event.pointerType === "touch") return;

      root.style.setProperty("--motion-cursor-x", `${event.clientX}px`);
      root.style.setProperty("--motion-cursor-y", `${event.clientY}px`);
    }

    applyEnhancements();
    updatePageMotion();

    window.addEventListener("scroll", updatePageMotion, { passive: true });
    window.addEventListener("resize", updatePageMotion);
    window.addEventListener("pointermove", updateAmbientPointer, {
      passive: true,
    });

    const mutationObserver = new MutationObserver(() => {
      if (mutationFrame) {
        window.cancelAnimationFrame(mutationFrame);
      }

      mutationFrame = window.requestAnimationFrame(applyEnhancements);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      revealObserver?.disconnect();
      mutationObserver.disconnect();

      if (mutationFrame) {
        window.cancelAnimationFrame(mutationFrame);
      }

      window.removeEventListener("scroll", updatePageMotion);
      window.removeEventListener("resize", updatePageMotion);
      window.removeEventListener("pointermove", updateAmbientPointer);

      cleanups.forEach((cleanup) => cleanup());
    };
  }, [location.pathname, location.hash]);

  return null;
}
