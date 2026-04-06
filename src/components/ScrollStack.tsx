/**
 * Scroll Stack — inspiré de React Bits (https://reactbits.dev/components/scroll-stack)
 * Scroll natif, cache de layout anti-jitter, lissage RAF + easing.
 */
import {
  useLayoutEffect,
  useRef,
  useCallback,
  type ReactNode,
  type RefObject,
} from 'react';
import './ScrollStack.css';

export interface ScrollStackItemProps {
  children: ReactNode;
  itemClassName?: string;
}

export const ScrollStackItem = ({ children, itemClassName = '' }: ScrollStackItemProps) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

export interface ScrollStackProps {
  children: ReactNode;
  className?: string;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  scrollRootRef?: RefObject<HTMLElement | null>;
  onStackComplete?: () => void;
  centerStackVertically?: boolean;
  /** Plus bas = amorti plus doux (ex. 0.12–0.35). */
  smoothFactor?: number;
}

type CardTarget = { ty: number; sc: number; rot: number; bl: number };

const CARD_REST: CardTarget = { ty: 0, sc: 1, rot: 0, bl: 0 };

function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - (1 - t) ** 3;
}

/** Smoothstep quintique (Perlin). */
function smootherstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function damp(current: number, target: number, factor: number, eps: number): { value: number; moving: boolean } {
  if (Math.abs(target - current) < eps) {
    return { value: target, moving: false };
  }
  return { value: current + (target - current) * factor, moving: true };
}

function setWebKitTransform(el: HTMLElement, value: string) {
  (el.style as CSSStyleDeclaration & { webkitTransform?: string }).webkitTransform = value;
}

function setWebKitPerspective(el: HTMLElement, value: string) {
  (el.style as CSSStyleDeclaration & { webkitPerspective?: string }).webkitPerspective = value;
}

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  scrollRootRef,
  onStackComplete,
  centerStackVertically = false,
  smoothFactor = 0.26,
}: ScrollStackProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const cardsRef = useRef<HTMLElement[]>([]);
  const firstCardHeightRef = useRef(0);
  const layoutTopCacheRef = useRef<Map<HTMLElement, number>>(new Map());
  const endLayoutTopRef = useRef(0);
  const smoothedRef = useRef<CardTarget[]>([]);
  const animLoopRef = useRef<number | null>(null);

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return typeof value === 'number' ? value : parseFloat(String(value));
  }, []);

  const getScrollData = useCallback(() => {
    const root = scrollRootRef?.current;
    if (root) {
      return { scrollTop: root.scrollTop, containerHeight: root.clientHeight };
    }
    if (useWindowScroll) {
      return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
    }
    const scroller = scrollerRef.current;
    return {
      scrollTop: scroller?.scrollTop ?? 0,
      containerHeight: scroller?.clientHeight ?? 0,
    };
  }, [useWindowScroll, scrollRootRef]);

  const getCachedCardTop = useCallback((card: HTMLElement) => layoutTopCacheRef.current.get(card), []);

  const remeasureLayoutTops = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = cardsRef.current.length
      ? cardsRef.current
      : Array.from(scroller.querySelectorAll<HTMLElement>('.scroll-stack-card'));

    if (!cards.length) return;

    firstCardHeightRef.current = cards[0]?.offsetHeight ?? 0;

    const saved = cards.map((el) => ({
      el,
      transform: el.style.transform,
      filter: el.style.filter,
    }));

    saved.forEach(({ el }) => {
      el.style.transform = 'none';
      el.style.filter = 'none';
    });

    void scroller.offsetHeight;

    const cache = layoutTopCacheRef.current;
    cache.clear();

    const root = scrollRootRef?.current;
    const endEl = scroller.querySelector('.scroll-stack-end') as HTMLElement | null;

    const setEndTop = (top: number) => {
      endLayoutTopRef.current = top;
    };

    if (root) {
      const r = root.getBoundingClientRect();
      const sTop = root.scrollTop;
      cards.forEach((card) => {
        const c = card.getBoundingClientRect();
        cache.set(card, c.top - r.top + sTop);
      });
      if (endEl) {
        const e = endEl.getBoundingClientRect();
        setEndTop(e.top - r.top + sTop);
      } else {
        setEndTop(0);
      }
    } else if (useWindowScroll) {
      cards.forEach((card) => {
        const c = card.getBoundingClientRect();
        cache.set(card, c.top + window.scrollY);
      });
      if (endEl) {
        const e = endEl.getBoundingClientRect();
        setEndTop(e.top + window.scrollY);
      } else {
        setEndTop(0);
      }
    } else {
      const sr = scroller.getBoundingClientRect();
      const sTop = scroller.scrollTop;
      cards.forEach((card) => {
        const c = card.getBoundingClientRect();
        cache.set(card, c.top - sr.top + sTop);
      });
      if (endEl) {
        const e = endEl.getBoundingClientRect();
        setEndTop(e.top - sr.top + sTop);
      } else {
        setEndTop(0);
      }
    }

    saved.forEach(({ el, transform, filter }) => {
      el.style.transform = transform;
      el.style.filter = filter;
    });

    smoothedRef.current = [];
  }, [useWindowScroll, scrollRootRef]);

  const computeTargets = useCallback(
    (scrollTop: number, containerHeight: number): { targets: CardTarget[]; lastPinned: boolean } => {
      const cards = cardsRef.current;
      const nCards = Math.max(1, cards.length);
      const spread = (nCards - 1) * itemStackDistance;
      const fh = firstCardHeightRef.current;

      let stackPositionPx = parsePercentage(stackPosition, containerHeight);
      if (centerStackVertically && fh > 0 && containerHeight > 0) {
        stackPositionPx = Math.max(24, (containerHeight - (fh + spread)) / 2);
      }

      const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
      const endElementTop = endLayoutTopRef.current;
      const pinBlend = Math.min(100, Math.max(56, containerHeight * 0.11));

      const targets: CardTarget[] = [];
      let lastPinned = false;

      cards.forEach((card, i) => {
        if (!card) {
          targets.push({ ...CARD_REST });
          return;
        }

        const cardTop = getCachedCardTop(card);
        if (cardTop === undefined) {
          targets.push({ ...CARD_REST });
          return;
        }

        const rowTop = cardTop - stackPositionPx - itemStackDistance * i;
        const triggerEnd = cardTop - scaleEndPositionPx;
        const pinEnd = endElementTop - containerHeight / 2;

        const scaleProgressLinear = calculateProgress(scrollTop, rowTop, triggerEnd);
        const scaleProgress = easeOutCubic(scaleProgressLinear);
        const targetScale = baseScale + i * itemScale;
        let scaleVal = 1 - scaleProgress * (1 - targetScale);
        let rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

        let blur = 0;
        if (blurAmount) {
          let topCardIndex = 0;
          for (let j = 0; j < cards.length; j++) {
            const jCard = cards[j];
            if (!jCard) continue;
            const jCardTop = getCachedCardTop(jCard);
            if (jCardTop === undefined) continue;
            const jRowTop = jCardTop - stackPositionPx - itemStackDistance * j;
            if (scrollTop >= jRowTop) {
              topCardIndex = j;
            }
          }
          if (i < topCardIndex) {
            blur = Math.max(0, (topCardIndex - i) * blurAmount);
          }
        }

        const pinTY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
        let translateY = 0;

        if (scrollTop < rowTop - pinBlend) {
          translateY = 0;
        } else if (scrollTop < rowTop) {
          translateY = pinTY * smootherstep01((scrollTop - (rowTop - pinBlend)) / pinBlend);
        } else if (scrollTop <= pinEnd) {
          translateY = pinTY;
          if (i === cards.length - 1) {
            lastPinned = true;
          }
        } else {
          const frozenY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
          const spAtPinEnd = easeOutCubic(calculateProgress(pinEnd, rowTop, triggerEnd));
          const scaleAtPinEnd = 1 - spAtPinEnd * (1 - targetScale);
          const rotAtPinEnd = rotationAmount ? i * rotationAmount * spAtPinEnd : 0;

          const unstackRange = Math.max(280, containerHeight * 0.52);
          const smooth = smootherstep01(Math.min(1, (scrollTop - pinEnd) / unstackRange));

          translateY = frozenY * (1 - smooth);
          scaleVal = scaleAtPinEnd + (1 - scaleAtPinEnd) * smooth;
          rotation = rotAtPinEnd * (1 - smooth);
          blur *= 1 - smooth;
        }

        targets.push({ ty: translateY, sc: scaleVal, rot: rotation, bl: blur });
      });

      return { targets, lastPinned };
    },
    [
      itemStackDistance,
      stackPosition,
      scaleEndPosition,
      baseScale,
      itemScale,
      rotationAmount,
      blurAmount,
      calculateProgress,
      parsePercentage,
      getCachedCardTop,
      centerStackVertically,
    ]
  );

  const applyCardStyle = useCallback((card: HTMLElement, v: CardTarget) => {
    const ty = Number.isFinite(v.ty) ? v.ty : 0;
    const sc = Number.isFinite(v.sc) ? v.sc : 1;
    const rot = Number.isFinite(v.rot) ? v.rot : 0;
    const bl = Number.isFinite(v.bl) ? v.bl : 0;
    card.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
    card.style.filter = bl > 0.02 ? `blur(${bl.toFixed(2)}px)` : '';
  }, []);

  const tick = useCallback(() => {
    animLoopRef.current = null;
    const cards = cardsRef.current;
    if (!cards.length) return;

    const { scrollTop, containerHeight } = getScrollData();
    const { targets, lastPinned } = computeTargets(scrollTop, containerHeight);

    const f = smoothFactor;
    const eps = 0.08;
    let needsFrame = false;

    while (smoothedRef.current.length < targets.length) {
      smoothedRef.current.push({ ...CARD_REST });
    }

    for (let i = 0; i < targets.length; i++) {
      const card = cards[i];
      const t = targets[i];
      if (!card || !t) continue;

      const s = smoothedRef.current[i]!;

      const dTy = damp(s.ty, t.ty, f, eps);
      const dSc = damp(s.sc, t.sc, f, eps);
      const dRot = damp(s.rot, t.rot, f, eps);
      const dBl = damp(s.bl, t.bl, f, eps);

      s.ty = dTy.value;
      s.sc = dSc.value;
      s.rot = dRot.value;
      s.bl = dBl.value;

      if (dTy.moving || dSc.moving || dRot.moving || dBl.moving) {
        needsFrame = true;
      }

      applyCardStyle(card, s);
    }

    if (lastPinned && !stackCompletedRef.current) {
      stackCompletedRef.current = true;
      onStackComplete?.();
    } else if (!lastPinned && stackCompletedRef.current) {
      stackCompletedRef.current = false;
    }

    if (needsFrame) {
      animLoopRef.current = requestAnimationFrame(tick);
    }
  }, [getScrollData, computeTargets, applyCardStyle, smoothFactor, onStackComplete]);

  const requestTick = useCallback(() => {
    if (animLoopRef.current == null) {
      animLoopRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('.scroll-stack-card'));

    cardsRef.current = cards;
    layoutTopCacheRef.current.clear();
    smoothedRef.current = [];

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.zIndex = String(10 + i);
      card.style.willChange = 'transform';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      setWebKitTransform(card, 'translateZ(0)');
      card.style.perspective = '1000px';
      setWebKitPerspective(card, '1000px');
    });

    remeasureLayoutTops();
    requestTick();

    const inner = scroller.querySelector('.scroll-stack-inner');

    const onResizeOrReflow = () => {
      remeasureLayoutTops();
      smoothedRef.current = [];
      requestTick();
    };

    let ro: ResizeObserver | null = null;
    if (inner instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResizeOrReflow);
      ro.observe(inner);
    }

    const resetRefs = () => {
      ro?.disconnect();
      if (animLoopRef.current != null) {
        cancelAnimationFrame(animLoopRef.current);
      }
      animLoopRef.current = null;
      stackCompletedRef.current = false;
      cardsRef.current = [];
      layoutTopCacheRef.current.clear();
      smoothedRef.current = [];
    };

    const root = scrollRootRef?.current;
    if (root) {
      root.addEventListener('scroll', requestTick, { passive: true });
      window.addEventListener('resize', onResizeOrReflow);
      return () => {
        root.removeEventListener('scroll', requestTick);
        window.removeEventListener('resize', onResizeOrReflow);
        resetRefs();
      };
    }

    if (useWindowScroll) {
      window.addEventListener('scroll', requestTick, { passive: true });
      window.addEventListener('resize', onResizeOrReflow);
      return () => {
        window.removeEventListener('scroll', requestTick);
        window.removeEventListener('resize', onResizeOrReflow);
        resetRefs();
      };
    }

    scroller.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', onResizeOrReflow);

    return () => {
      scroller.removeEventListener('scroll', requestTick);
      window.removeEventListener('resize', onResizeOrReflow);
      resetRefs();
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    scrollRootRef,
    centerStackVertically,
    smoothFactor,
    remeasureLayoutTops,
    requestTick,
  ]);

  const useExternalScroll = Boolean(scrollRootRef) || useWindowScroll;
  const scrollerClass =
    `scroll-stack-scroller${useExternalScroll ? ' scroll-stack-scroller--window' : ''} ${className}`.trim();

  return (
    <div className={scrollerClass} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" aria-hidden />
      </div>
    </div>
  );
};

export default ScrollStack;
