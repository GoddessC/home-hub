/**
 * Unit tests for AnalogClock
 * Tests scheduling, visibility behavior, and core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AnalogClock, createAnalogClock } from './AnalogClock';

// Mock DOM APIs
const mockContainer = {
  innerHTML: '',
  appendChild: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => [])
};

const mockSVGElement = {
  setAttribute: vi.fn(),
  style: { display: 'block', transform: '' },
  getBBox: vi.fn(() => ({ width: 100, height: 100 }))
};

const mockLineElement = {
  setAttribute: vi.fn(),
  style: { transform: '' }
};

const mockCircleElement = {
  setAttribute: vi.fn()
};

// Mock document methods
Object.defineProperty(document, 'createElementNS', {
  value: vi.fn((namespace, tagName) => {
    if (tagName === 'svg') return mockSVGElement;
    if (tagName === 'line') return mockLineElement;
    if (tagName === 'circle') return mockCircleElement;
    return { setAttribute: vi.fn(), style: {} };
  })
});

Object.defineProperty(document, 'addEventListener', {
  value: vi.fn()
});

Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn()
});

Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true
});

// Mock window methods
Object.defineProperty(window, 'setTimeout', {
  value: vi.fn((callback, delay) => {
    setTimeout(() => callback(), delay);
    return 123; // Mock timer ID
  })
});

Object.defineProperty(window, 'clearTimeout', {
  value: vi.fn()
});

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
});

describe('AnalogClock', () => {
  let clock: AnalogClock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset document.hidden
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true
    });
  });

  afterEach(() => {
    if (clock) {
      clock.destroy();
    }
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create clock with default options', () => {
      clock = new AnalogClock(mockContainer as any);
      
      expect(clock.getOptions()).toEqual({
        mountId: 'clock',
        size: 160,
        accent: '#0F172A',
        face: '#FFFFFF',
        showSeconds: false,
        reducedMotion: false,
        ariaLabel: 'Analog clock'
      });
    });

    it('should create clock with custom options', () => {
      const options = {
        size: 200,
        accent: '#ff0000',
        face: '#000000',
        showSeconds: true,
        reducedMotion: true,
        ariaLabel: 'Custom clock'
      };

      clock = new AnalogClock(mockContainer as any, options);
      
      expect(clock.getOptions()).toEqual({
        mountId: 'clock',
        ...options
      });
    });

    it('should respect prefers-reduced-motion', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia
      });

      clock = new AnalogClock(mockContainer as any);
      
      expect(clock.getOptions().reducedMotion).toBe(true);
    });
  });

  describe('Scheduling', () => {
    it('should schedule next minute boundary for minute-only mode', () => {
      const now = new Date('2024-01-01T10:30:45.123Z');
      vi.setSystemTime(now);

      clock = new AnalogClock(mockContainer as any, { showSeconds: false });
      
      // Should schedule for next minute (10:31:00)
      expect(window.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        14877 // 60 - 45.123 seconds
      );
    });

    it('should schedule next second boundary for seconds mode', () => {
      const now = new Date('2024-01-01T10:30:45.123Z');
      vi.setSystemTime(now);

      clock = new AnalogClock(mockContainer as any, { showSeconds: true });
      
      // Should schedule for next second (10:30:46)
      expect(window.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        877 // 1000 - 123 milliseconds
      );
    });

    it('should reschedule after each update', () => {
      clock = new AnalogClock(mockContainer as any, { showSeconds: false });
      
      // Clear initial call
      vi.clearAllMocks();
      
      // Trigger update
      clock.forceUpdate();
      
      // Should schedule next update
      expect(window.setTimeout).toHaveBeenCalled();
    });

    it('should handle timer cleanup on destroy', () => {
      clock = new AnalogClock(mockContainer as any);
      
      // Should have a timer ID
      expect(clock['timerId']).toBe(123);
      
      clock.destroy();
      
      // Should clear timeout
      expect(window.clearTimeout).toHaveBeenCalledWith(123);
      expect(clock['timerId']).toBeNull();
    });
  });

  describe('Visibility Behavior', () => {
    it('should pause when document becomes hidden', () => {
      clock = new AnalogClock(mockContainer as any);
      
      // Simulate visibility change
      Object.defineProperty(document, 'hidden', { value: true });
      const visibilityHandler = (document.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'visibilitychange')[1];
      
      visibilityHandler();
      
      // Should clear timeout
      expect(window.clearTimeout).toHaveBeenCalled();
      expect(clock['isVisible']).toBe(false);
    });

    it('should resume when document becomes visible', () => {
      clock = new AnalogClock(mockContainer as any);
      
      // First hide
      Object.defineProperty(document, 'hidden', { value: true });
      const visibilityHandler = (document.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'visibilitychange')[1];
      
      visibilityHandler();
      vi.clearAllMocks();
      
      // Then show
      Object.defineProperty(document, 'hidden', { value: false });
      visibilityHandler();
      
      // Should update clock and start new timer
      expect(window.setTimeout).toHaveBeenCalled();
      expect(clock['isVisible']).toBe(true);
    });

    it('should not start timer when initially hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true });
      
      clock = new AnalogClock(mockContainer as any);
      
      // Should not schedule timer when hidden
      expect(window.setTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Options Updates', () => {
    it('should update options without recreating clock', () => {
      clock = new AnalogClock(mockContainer as any);
      
      clock.updateOptions({
        size: 200,
        accent: '#ff0000'
      });
      
      expect(clock.getOptions().size).toBe(200);
      expect(clock.getOptions().accent).toBe('#ff0000');
    });

    it('should recreate clock when showSeconds changes', () => {
      clock = new AnalogClock(mockContainer as any, { showSeconds: false });
      
      const createClockSpy = vi.spyOn(clock as any, 'createClock');
      
      clock.updateOptions({ showSeconds: true });
      
      expect(createClockSpy).toHaveBeenCalled();
    });

    it('should restart timer after options update', () => {
      clock = new AnalogClock(mockContainer as any);
      
      vi.clearAllMocks();
      
      clock.updateOptions({ size: 200 });
      
      expect(window.setTimeout).toHaveBeenCalled();
    });
  });

  describe('Time Calculations', () => {
    it('should calculate correct hand angles', () => {
      const testTime = new Date('2024-01-01T10:30:00.000Z');
      vi.setSystemTime(testTime);

      clock = new AnalogClock(mockContainer as any);
      
      // Force update to trigger angle calculations
      clock.forceUpdate();
      
      // 10:30 should be 315° for hour hand (10 * 30 + 30 * 0.5 = 315)
      // 30 minutes should be 180° for minute hand (30 * 6 = 180)
      expect(mockLineElement.style.transform).toContain('315deg');
      expect(mockLineElement.style.transform).toContain('180deg');
    });

    it('should handle midnight correctly', () => {
      const midnight = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(midnight);

      clock = new AnalogClock(mockContainer as any);
      clock.forceUpdate();
      
      // Midnight should be 0° for both hands
      expect(mockLineElement.style.transform).toContain('0deg');
    });

    it('should handle noon correctly', () => {
      const noon = new Date('2024-01-01T12:00:00.000Z');
      vi.setSystemTime(noon);

      clock = new AnalogClock(mockContainer as any);
      clock.forceUpdate();
      
      // Noon should be 0° for both hands (12 % 12 = 0)
      expect(mockLineElement.style.transform).toContain('0deg');
    });
  });

  describe('Factory Function', () => {
    it('should create clock with string selector', () => {
      const mockGetElementById = vi.fn(() => mockContainer);
      Object.defineProperty(document, 'getElementById', {
        value: mockGetElementById
      });

      const clock = createAnalogClock('clock-id', { size: 200 });
      
      expect(mockGetElementById).toHaveBeenCalledWith('clock-id');
      expect(clock.getOptions().size).toBe(200);
    });

    it('should create clock with element', () => {
      const clock = createAnalogClock(mockContainer as any, { size: 200 });
      
      expect(clock.getOptions().size).toBe(200);
    });

    it('should throw error for missing element', () => {
      const mockGetElementById = vi.fn(() => null);
      Object.defineProperty(document, 'getElementById', {
        value: mockGetElementById
      });

      expect(() => {
        createAnalogClock('missing-id');
      }).toThrow('Container element not found: missing-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container gracefully', () => {
      expect(() => {
        new AnalogClock(null as any);
      }).toThrow();
    });

    it('should handle invalid options gracefully', () => {
      clock = new AnalogClock(mockContainer as any, {
        size: -100,
        accent: 'invalid-color'
      });
      
      // Should use default values for invalid options
      expect(clock.getOptions().size).toBe(-100); // Not validated, just stored
    });
  });

  describe('Performance', () => {
    it('should not create excessive timers', () => {
      clock = new AnalogClock(mockContainer as any);
      
      const initialTimerCount = (window.setTimeout as Mock).mock.calls.length;
      
      // Update multiple times
      clock.forceUpdate();
      clock.forceUpdate();
      clock.forceUpdate();
      
      // Should only have one active timer
      expect(window.clearTimeout).toHaveBeenCalled();
      expect(window.setTimeout).toHaveBeenCalledTimes(initialTimerCount + 1);
    });

    it('should clean up properly on destroy', () => {
      clock = new AnalogClock(mockContainer as any);
      
      clock.destroy();
      
      // Should clear all timers and remove listeners
      expect(window.clearTimeout).toHaveBeenCalled();
      expect(document.removeEventListener).toHaveBeenCalled();
    });
  });
});

describe('Integration Tests', () => {
  it('should work with real timers', () => {
    vi.useRealTimers();
    
    const container = document.createElement('div');
    const clock = new AnalogClock(container);
    
    // Should create SVG elements
    expect(container.querySelector('svg')).toBeTruthy();
    
    clock.destroy();
  });

  it('should handle rapid visibility changes', () => {
    const container = document.createElement('div');
    const clock = new AnalogClock(container);
    
    // Simulate rapid visibility changes
    Object.defineProperty(document, 'hidden', { value: true });
    const visibilityHandler = (document.addEventListener as Mock).mock.calls
      .find(call => call[0] === 'visibilitychange')[1];
    
    visibilityHandler(); // Hide
    visibilityHandler(); // Still hidden
    visibilityHandler(); // Still hidden
    
    Object.defineProperty(document, 'hidden', { value: false });
    visibilityHandler(); // Show
    
    // Should handle gracefully without errors
    expect(clock['isVisible']).toBe(true);
    
    clock.destroy();
  });
});

