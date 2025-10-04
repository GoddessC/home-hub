/**
 * React wrapper for AnalogClock that never re-renders after mount
 * Updates are handled via refs for optimal performance
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AnalogClock, AnalogClockOptions } from './AnalogClock';

export interface AnalogClockRef {
  updateOptions: (options: Partial<AnalogClockOptions>) => void;
  forceUpdate: () => void;
  getOptions: () => Readonly<AnalogClockOptions>;
  destroy: () => void;
}

export interface AnalogClockProps extends AnalogClockOptions {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * React component wrapper for AnalogClock
 * Never re-renders after mount - all updates happen via refs
 */
export const AnalogClockReact = forwardRef<AnalogClockRef, AnalogClockProps>(
  ({ className, style, ...options }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const clockInstanceRef = useRef<AnalogClock | null>(null);

    useImperativeHandle(ref, () => ({
      updateOptions: (newOptions: Partial<AnalogClockOptions>) => {
        clockInstanceRef.current?.updateOptions(newOptions);
      },
      forceUpdate: () => {
        clockInstanceRef.current?.forceUpdate();
      },
      getOptions: () => {
        return clockInstanceRef.current?.getOptions() || {};
      },
      destroy: () => {
        clockInstanceRef.current?.destroy();
        clockInstanceRef.current = null;
      }
    }), []);

    useEffect(() => {
      if (!containerRef.current) return;

      // Create clock instance
      clockInstanceRef.current = new AnalogClock(containerRef.current, options);

      // Cleanup on unmount
      return () => {
        clockInstanceRef.current?.destroy();
        clockInstanceRef.current = null;
      };
    }, []); // Empty dependency array - only run once on mount

    // Update options when props change (without re-rendering)
    useEffect(() => {
      if (clockInstanceRef.current) {
        clockInstanceRef.current.updateOptions(options);
      }
    }, [options.size, options.accent, options.face, options.showSeconds, options.reducedMotion, options.ariaLabel]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={style}
        data-testid="analog-clock-container"
      />
    );
  }
);

AnalogClockReact.displayName = 'AnalogClockReact';

/**
 * Hook for easier access to clock methods
 */
export function useAnalogClock(ref: React.RefObject<AnalogClockRef>) {
  return {
    updateOptions: (options: Partial<AnalogClockOptions>) => {
      ref.current?.updateOptions(options);
    },
    forceUpdate: () => {
      ref.current?.forceUpdate();
    },
    getOptions: () => {
      return ref.current?.getOptions() || {};
    },
    destroy: () => {
      ref.current?.destroy();
    }
  };
}

export default AnalogClockReact;

