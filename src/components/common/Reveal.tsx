import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: RevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const delaySeconds = typeof delay === 'number' ? delay * 0.08 : delay * 0.08;

  const initialVariants = {
    up: { opacity: 0, y: 32, scale: 0.97, filter: 'blur(8px)' },
    down: { opacity: 0, y: -32, scale: 0.97, filter: 'blur(8px)' },
    left: { opacity: 0, x: 32, scale: 0.97, filter: 'blur(8px)' },
    right: { opacity: 0, x: -32, scale: 0.97, filter: 'blur(8px)' },
  };

  return (
    <motion.div
      ref={elementRef}
      initial={initialVariants[direction]}
      animate={
        visible
          ? { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }
          : initialVariants[direction]
      }
      transition={{
        duration: 0.7,
        delay: delaySeconds,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

