import { useEffect } from 'react';

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Home scroll effect: the light block "lifts" over the hero.
 * - [data-lift-panel]: rises from below and grows from 94% to 100% as it enters the viewport.
 * - [data-lift-hero]: moves slower than the page (parallax), shrinks slightly and dims as it is covered.
 * Writes transforms straight to the DOM (no React re-renders). Disabled with prefers-reduced-motion.
 */
export function useScrollLift() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const panel = document.querySelector<HTMLElement>('[data-lift-panel]');
    const hero = document.querySelector<HTMLElement>('[data-lift-hero]');
    if (!panel && !hero) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;

      if (panel) {
        const top = panel.getBoundingClientRect().top; // distance of the panel's top edge from viewport top
        // 0 when the panel is at the bottom of the screen, 1 when it reaches ~30% from the top
        const q = easeOut(clamp((vh - top) / (vh * 0.7)));
        const small = window.innerWidth < 640;
        panel.style.transform = `translate3d(0, ${(1 - q) * (small ? 40 : 90)}px, 0) scale(${(small ? 0.97 : 0.94) + (small ? 0.03 : 0.06) * q})`;
      }

      if (hero) {
        const p = clamp(y / (vh * 0.9));
        hero.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(${1 - 0.05 * p})`;
        hero.style.opacity = String(1 - 0.65 * p);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (panel) panel.style.transform = '';
      if (hero) { hero.style.transform = ''; hero.style.opacity = ''; }
    };
  }, []);
}
