/**
 * Analog Clock Component for Dashboard
 * Lightweight implementation using the core AnalogClock class
 */

import React, { useEffect, useRef } from 'react';
import { AnalogClock, AnalogClockOptions } from '../../AnalogClock';
import './AnalogClock.css';

interface AnalogClockProps {
  size?: number;
  accent?: string;
  face?: string;
  showSeconds?: boolean;
  reducedMotion?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const AnalogClockComponent: React.FC<AnalogClockProps> = ({
  size = 80,
  accent = '#0F172A',
  face = '#FFFFFF',
  showSeconds = false,
  reducedMotion = false,
  ariaLabel = 'Analog clock',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clockInstanceRef = useRef<AnalogClock | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create clock instance
    const options: AnalogClockOptions = {
      size,
      accent,
      face,
      showSeconds,
      reducedMotion,
      ariaLabel
    };

    clockInstanceRef.current = new AnalogClock(containerRef.current, options);

    // Cleanup on unmount
    return () => {
      clockInstanceRef.current?.destroy();
      clockInstanceRef.current = null;
    };
  }, []);

  // Update options when props change
  useEffect(() => {
    if (clockInstanceRef.current) {
      clockInstanceRef.current.updateOptions({
        size,
        accent,
        face,
        showSeconds,
        reducedMotion,
        ariaLabel
      });
    }
  }, [size, accent, face, showSeconds, reducedMotion, ariaLabel]);

  return (
    <div
      ref={containerRef}
      className={`analog-clock-container ${className}`}
      style={{ display: 'inline-block' }}
    />
  );
};

export default AnalogClockComponent;
