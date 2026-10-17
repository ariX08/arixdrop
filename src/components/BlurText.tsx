'use client';

import { motion, MotionConfig } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const AXES: Record<string, [string, number]> = {
  top: ['y', -1],
  bottom: ['y', 1],
  left: ['x', -1],
  right: ['x', 1]
};

const EASE_OUT = [0.33, 1, 0.68, 1];
const EASE_IN_OUT = [0.65, 0, 0.35, 1];
const EASE_IN = [0.55, 0, 0.9, 0.45];
const CSS_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const MOVE_KEYS = ['x', 'y', 'scale', 'rotateX', 'rotateY', 'skewX'];
const INSTANT = { duration: 0 };

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  userSelect: 'none'
};

const PIECE_STYLE: React.CSSProperties = { display: 'inline-block', willChange: 'transform, filter, opacity' };
const WORD_STYLE: React.CSSProperties = { display: 'inline-flex' };

const blurTo = (px: number) => `blur(${Math.max(0, px)}px)`;

const buildEffect = (effect: string, direction: string, blur: number, distance: number) => {
  const [axis, sign] = AXES[direction] || AXES.top;
  const b = Math.max(0, blur);
  const d = distance;

  if (effect === 'zoom') {
    return {
      from: { filter: blurTo(b * 1.2), opacity: 0, scale: 1.4, [axis]: sign * d * 0.35 },
      steps: [
        { filter: blurTo(b * 0.2), opacity: 0.9, scale: 0.97, [axis]: -sign * d * 0.03 },
        { filter: blurTo(0), opacity: 1, scale: 1, [axis]: 0 }
      ],
      exit: { filter: blurTo(b), opacity: 0, scale: 0.82, [axis]: -sign * d * 0.2 },
      times: [0, 0.6, 1],
      fade: EASE_OUT,
      bounce: 0.25,
      settle: 0.5,
      exitEase: EASE_IN
    };
  }

  return {
    from: { filter: blurTo(b), opacity: 0, [axis]: sign * d },
    steps: [
      { filter: blurTo(b / 2), opacity: 0.5, [axis]: (-sign * d) / 10 },
      { filter: blurTo(0), opacity: 1, [axis]: 0 }
    ],
    exit: { filter: blurTo(b), opacity: 0, [axis]: -sign * d * 0.6 },
    times: [0, 0.5, 1],
    fade: 'linear' as const,
    bounce: 0.35,
    settle: 0.5,
    exitEase: EASE_IN
  };
};

const buildKeyframes = (from: any, steps: any[]) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);
  const keyframes: any = {};
  keys.forEach(k => {
    keyframes[k] = [from[k], ...steps.map(s => s[k])];
  });
  return keyframes;
};

const buildRanks = (count: number, staggerFrom: string, seedText: string) => {
  const ranks = Array.from({ length: count }, (_, i) => i);
  if (staggerFrom === 'end') return ranks.map(i => count - 1 - i);
  if (staggerFrom === 'center') {
    const mid = (count - 1) / 2;
    const offset = count % 2 === 0 ? 0.5 : 0;
    return ranks.map(i => Math.abs(i - mid) - offset);
  }
  return ranks;
};

const startPhase = (trigger: string) =>
  trigger === 'load' ? 'in' : trigger === 'hover' || trigger === 'click' ? 'rest' : 'from';

export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing,
  onAnimationComplete,
  stepDuration = 0.35,
  blur = 10,
  distance = 50,
  effect = 'blur',
  staggerFrom = 'start',
  trigger = 'view',
  loop = false,
  loopDelay = 2,
  color,
  fromColor,
  focusOnHover = false
}: any) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [phase, setPhase] = useState(() => startPhase(trigger));
  const firstPhase = useRef(phase).current;
  const [focusWord, setFocusWord] = useState(-1);
  const settledRef = useRef(phase === 'rest');
  const completeRef = useRef(onAnimationComplete);
  completeRef.current = onAnimationComplete;

  const fx = useMemo(() => buildEffect(effect, direction, blur, distance), [effect, direction, blur, distance]);

  const custom = Boolean(animationFrom || animationTo || easing);
  const fromSnapshot = animationFrom ?? fx.from;
  const toSnapshots = animationTo ?? fx.steps;
  const exitSnapshot = animationFrom ?? fx.exit;
  const restSnapshot = toSnapshots[toSnapshots.length - 1];
  const animateKeyframes = useMemo(
    () => buildKeyframes(fromSnapshot, custom ? toSnapshots : [restSnapshot]),
    [fromSnapshot, toSnapshots, restSnapshot, custom]
  );

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = animationTo
    ? Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)))
    : fx.times;
  const stagger = Math.max(0, delay) / 1000;
  const exitDuration = stepDuration * 1.3;
  const exitStagger = stagger * 0.4;

  const words = useMemo(() => text.split(' '), [text]);

  const pieces = useMemo(() => {
    const list: any[] = [];
    words.forEach((word: string, w: number) => {
      const isLast = w === words.length - 1;
      if (animateBy === 'words') {
        list.push({ word: w, content: isLast ? word : `${word}\u00A0`, key: `word-${w}` });
        return;
      }
      Array.from(word).forEach((char, c) => list.push({ word: w, content: char, key: `char-${w}-${c}` }));
      if (!isLast) list.push({ word: w, content: '\u00A0', key: `space-${w}` });
    });
    return list;
  }, [words, animateBy]);

  const groups = useMemo(() => {
    const list: number[][] = words.map(() => []);
    pieces.forEach((piece, index) => list[piece.word].push(index));
    return list;
  }, [words, pieces]);

  const ranks = useMemo(() => buildRanks(pieces.length, staggerFrom, text), [pieces.length, staggerFrom, text]);
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 0);
  const inTotal = (totalDuration * (custom ? 1 : Math.max(1, fx.settle * 2.2)) + maxRank * stagger) * 1000;
  const outTotal = (exitDuration + maxRank * exitStagger) * 1000;

  useEffect(() => {
    if (phase !== 'from') return undefined;
    if (trigger === 'load') {
      setPhase('in');
      return undefined;
    }
    if (trigger === 'hover' || trigger === 'click') {
      setPhase('rest');
      return undefined;
    }
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase(current => (current === 'from' ? 'in' : current));
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [phase, trigger, threshold, rootMargin]);

  useEffect(() => {
    let timer = 0;
    if (phase === 'in') {
      settledRef.current = false;
      timer = window.setTimeout(() => {
        settledRef.current = true;
        completeRef.current?.();
        if (loop) timer = window.setTimeout(() => setPhase('out'), Math.max(0, loopDelay) * 1000);
      }, inTotal);
    } else if (phase === 'rest') {
      settledRef.current = true;
      if (loop) timer = window.setTimeout(() => setPhase('out'), Math.max(0, loopDelay) * 1000);
    } else if (phase === 'out') {
      settledRef.current = false;
      timer = window.setTimeout(() => setPhase('in'), outTotal);
    }
    return () => window.clearTimeout(timer);
  }, [phase, loop, loopDelay, inTotal, outTotal]);

  const inTransition = (rank: number) => {
    const delayed = rank * stagger;
    if (custom) return { duration: totalDuration, times, delay: delayed, ease: easing ?? 'linear' };
    const transition: any = { duration: totalDuration, delay: delayed, ease: fx.fade };
    if (fx.bounce === null) return transition;
    const move = { type: 'spring', visualDuration: totalDuration * fx.settle, bounce: fx.bounce, delay: delayed };
    MOVE_KEYS.forEach(key => {
      if (key in fromSnapshot) transition[key] = move;
    });
    return transition;
  };

  const target =
    phase === 'in' ? animateKeyframes : phase === 'out' ? exitSnapshot : phase === 'rest' ? restSnapshot : fromSnapshot;
  const tinted = Boolean(fromColor) && (phase === 'from' || phase === 'out');
  const dim = Math.min(6, Math.max(2, blur * 0.3));
  const pieceStyle = PIECE_STYLE;

  const renderPiece = (index: number) => {
    const piece = pieces[index];
    const rank = ranks[index];
    const transition =
      phase === 'in'
        ? inTransition(rank)
        : phase === 'out'
          ? { duration: exitDuration, ease: fx.exitEase, delay: rank * exitStagger }
          : INSTANT;
    const style = fromColor
      ? {
          ...pieceStyle,
          color: tinted ? fromColor : undefined,
          transition:
            phase === 'in'
              ? `color ${totalDuration * 0.9}s ${CSS_EASE} ${rank * stagger}s`
              : phase === 'out'
                ? `color ${exitDuration}s ${CSS_EASE} ${rank * exitStagger}s`
                : 'none'
        }
      : pieceStyle;

    return (
      <motion.span
        aria-hidden="true"
        key={piece.key}
        style={style}
        initial={firstPhase === 'rest' ? false : fromSnapshot}
        animate={target}
        transition={transition}
      >
        {piece.content}
      </motion.span>
    );
  };

  const wordStyle = (w: number) => {
    if (!focusOnHover) return WORD_STYLE;
    const dimmed = focusWord !== -1 && focusWord !== w;
    return {
      ...WORD_STYLE,
      filter: dimmed ? `blur(${dim}px)` : 'blur(0px)',
      opacity: dimmed ? 0.3 : 1,
      transition: `filter 0.45s ${CSS_EASE}, opacity 0.45s ${CSS_EASE}`
    };
  };

  return (
    <MotionConfig reducedMotion="user">
      <p
        ref={ref}
        className={className}
        style={{ display: 'flex', flexWrap: 'wrap', color, justifyContent: 'center' }}
      >
        <span style={SR_ONLY}>{text}</span>
        {groups.map((indices, w) => (
          <span
            key={`word-${w}`}
            style={wordStyle(w)}
            onPointerEnter={focusOnHover ? () => setFocusWord(w) : undefined}
            onPointerLeave={focusOnHover ? () => setFocusWord(-1) : undefined}
          >
            {indices.map(renderPiece)}
          </span>
        ))}
      </p>
    </MotionConfig>
  );
}
