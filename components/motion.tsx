"use client";
import { useEffect } from "react";

export function useCleanMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !("IntersectionObserver" in window)) return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          if (reduced.matches) return;
          const animation = entry.target.animate(
            [
              { opacity: 0.4, transform: "translateY(20px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 580, easing: "cubic-bezier(.2,.7,.2,1)" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(
        ".service-card, .section-heading, .steps > li, .principles > div",
      )
      .forEach((element) => observer.observe(element));
    const stop = () => {
      if (reduced.matches)
        animations.forEach((animation) => animation.cancel());
    };
    reduced.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      reduced.removeEventListener("change", stop);
    };
  }, []);
}
