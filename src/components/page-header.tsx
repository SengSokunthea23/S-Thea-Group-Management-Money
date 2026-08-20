"use client";

import { useEffect, useRef, useState } from "react";

/** Below this the page has barely moved, so hiding would only ever flicker. */
const HIDE_AFTER_PX = 96;

/** Scroll deltas smaller than this are trackpad jitter, not intent. */
const JITTER_PX = 6;

/** How long after the last scroll event the header comes back. */
const IDLE_MS = 180;

/**
 * The bar at the top of a page, which stays reachable while you scroll.
 *
 * It sticks rather than scrolling away, so the primary action — New entry, New
 * source — is always one tap away instead of a scroll back to the top. But a
 * bar pinned over a long list also eats a chunk of a phone screen, so it slides
 * out of the way while you are actively scrolling *down*, and comes back the
 * moment you scroll up or simply stop.
 *
 * Two things keep that from being annoying:
 *
 *   - it never hides near the top of the page, where there is nothing to gain
 *   - it ignores sub-pixel jitter, so a trackpad cannot flap it on and off
 *
 * `prefers-reduced-motion` turns the slide into a plain appearance change, and
 * the header still occupies its space in the layout either way — hiding is
 * purely a transform, so nothing below it reflows.
 */
export function PageHeader({
  children,
  bordered = true,
}: {
  children: React.ReactNode;
  /**
   * Set false when the content draws its own bottom rule. The settings tabs do:
   * their active underline is pulled down a pixel to sit *on* that line, so the
   * line has to belong to the nav and not to this wrapper.
   */
  bordered?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  // Refs rather than state: these change on every scroll event and nothing
  // renders from them, so putting them in state would be a re-render per pixel.
  const lastY = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (Math.abs(delta) > JITTER_PX) {
        // Down past the threshold hides it; any upward movement brings it back
        // immediately, which is the gesture people use when they want it.
        setHidden(delta > 0 && y > HIDE_AFTER_PX);
        lastY.current = y;
      }

      // Coming to a stop counts as wanting it back, even mid-page.
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setHidden(false), IDLE_MS);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <header
      // top-14 clears the fixed mobile top bar; the desktop rail has none, so
      // it pins to the very top from md up.
      className={`sticky top-14 z-20 bg-surface transition-transform duration-200 ease-out motion-reduce:transition-none md:top-0 ${
        bordered ? "border-b border-border" : ""
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      {children}
    </header>
  );
}
