import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

interface TiltOptions {
  maxRotation?: number;
  perspective?: number;
  scaleOnHover?: number;
}

export function useInteractiveTilt({
  maxRotation = 10,
  perspective = 1000,
  scaleOnHover = 1.02,
}: TiltOptions = {}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const targetShineX = useRef(50);
  const targetShineY = useRef(50);
  const currentShineX = useRef(50);
  const currentShineY = useRef(50);
  const isHovered = useRef(false);
  const animFrameId = useRef<number | null>(null);

  const updateLoop = useCallback(() => {
    if (!elementRef.current) return;

    // Linear interpolation for silky 60fps spring physics
    const lerpFactor = isHovered.current ? 0.12 : 0.08;
    currentX.current += (targetX.current - currentX.current) * lerpFactor;
    currentY.current += (targetY.current - currentY.current) * lerpFactor;
    currentShineX.current += (targetShineX.current - currentShineX.current) * lerpFactor;
    currentShineY.current += (targetShineY.current - currentShineY.current) * lerpFactor;

    const el = elementRef.current;
    el.style.setProperty('--tilt-x', `${currentX.current.toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${currentY.current.toFixed(2)}deg`);
    el.style.setProperty('--shine-x', `${currentShineX.current.toFixed(2)}%`);
    el.style.setProperty('--shine-y', `${currentShineY.current.toFixed(2)}%`);
    el.style.setProperty('--parallax-x', `${(currentY.current * 0.8).toFixed(2)}px`);
    el.style.setProperty('--parallax-y', `${(-currentX.current * 0.8).toFixed(2)}px`);
    el.style.setProperty('--tilt-scale', isHovered.current ? `${scaleOnHover}` : '1');

    // Continue loop if still animating
    const diff =
      Math.abs(targetX.current - currentX.current) +
      Math.abs(targetY.current - currentY.current);

    if (isHovered.current || diff > 0.01) {
      animFrameId.current = requestAnimationFrame(updateLoop);
    } else {
      animFrameId.current = null;
    }
  }, [scaleOnHover]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch' || !elementRef.current) return;

      isHovered.current = true;
      const bounds = elementRef.current.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;

      targetX.current = (0.5 - y) * maxRotation;
      targetY.current = (x - 0.5) * maxRotation;
      targetShineX.current = x * 100;
      targetShineY.current = y * 100;

      if (!animFrameId.current) {
        animFrameId.current = requestAnimationFrame(updateLoop);
      }
    },
    [maxRotation, updateLoop]
  );

  const resetTilt = useCallback(() => {
    isHovered.current = false;
    targetX.current = 0;
    targetY.current = 0;
    targetShineX.current = 50;
    targetShineY.current = 50;

    if (!animFrameId.current) {
      animFrameId.current = requestAnimationFrame(updateLoop);
    }
  }, [updateLoop]);

  useEffect(() => {
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, []);

  return {
    ref: elementRef,
    onPointerMove: handlePointerMove,
    onPointerLeave: resetTilt,
    onPointerCancel: resetTilt,
    style: {
      perspective: `${perspective}px`,
    },
  };
}

