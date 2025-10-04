/**
 * Framework-agnostic, zero-dependency analog clock component
 * Uses SVG + minimal JS with CSS transforms for optimal performance
 */

export interface AnalogClockOptions {
  mountId?: string;      // default: "clock"
  size?: number;         // px, default: 160
  accent?: string;       // stroke color, default: "#0F172A"
  face?: string;         // face fill, default: "#FFFFFF"
  showSeconds?: boolean; // default: false
  reducedMotion?: boolean; // default: follow prefers-reduced-motion
  ariaLabel?: string;    // default: "Analog clock"
}

export class AnalogClock {
  private container: HTMLElement;
  private options: Required<AnalogClockOptions>;
  private hourHand!: SVGElement;
  private minuteHand!: SVGElement;
  private secondHand: SVGElement | null = null;
  private centerPin!: SVGElement;
  private timerId: number | null = null;
  private isVisible = true;

  constructor(container: HTMLElement, options: AnalogClockOptions = {}) {
    this.container = container;
    this.options = {
      mountId: 'clock',
      size: 160,
      accent: '#0F172A',
      face: '#FFFFFF',
      showSeconds: false,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ariaLabel: 'Analog clock',
      ...options
    };

    this.createClock();
    this.setupVisibilityListener();
    this.startTimer();
  }

  private createClock(): void {
    const { size, accent, face, ariaLabel } = this.options;
    const center = size / 2;
    const radius = center - 10;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', ariaLabel);
    svg.style.display = 'block';

    // Clock face
    const faceCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    faceCircle.setAttribute('cx', center.toString());
    faceCircle.setAttribute('cy', center.toString());
    faceCircle.setAttribute('r', radius.toString());
    faceCircle.setAttribute('fill', face);
    faceCircle.setAttribute('stroke', accent);
    faceCircle.setAttribute('stroke-width', '2');
    svg.appendChild(faceCircle);

    // Hour ticks
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const tickLength = i % 3 === 0 ? 8 : 4;
      const tickWidth = i % 3 === 0 ? 2 : 1;
      
      const x1 = center + (radius - 15) * Math.cos(angle - Math.PI / 2);
      const y1 = center + (radius - 15) * Math.sin(angle - Math.PI / 2);
      const x2 = center + (radius - 15 - tickLength) * Math.cos(angle - Math.PI / 2);
      const y2 = center + (radius - 15 - tickLength) * Math.sin(angle - Math.PI / 2);

      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', x1.toString());
      tick.setAttribute('y1', y1.toString());
      tick.setAttribute('x2', x2.toString());
      tick.setAttribute('y2', y2.toString());
      tick.setAttribute('stroke', accent);
      tick.setAttribute('stroke-width', tickWidth.toString());
      tick.setAttribute('stroke-linecap', 'round');
      svg.appendChild(tick);
    }

    // Hour hand
    this.hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.hourHand.setAttribute('x1', center.toString());
    this.hourHand.setAttribute('y1', center.toString());
    this.hourHand.setAttribute('x2', center.toString());
    this.hourHand.setAttribute('y2', (center - radius * 0.5).toString());
    this.hourHand.setAttribute('stroke', accent);
    this.hourHand.setAttribute('stroke-width', '3');
    this.hourHand.setAttribute('stroke-linecap', 'round');
    this.hourHand.setAttribute('transform-origin', `${center} ${center}`);
    svg.appendChild(this.hourHand);

    // Minute hand
    this.minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.minuteHand.setAttribute('x1', center.toString());
    this.minuteHand.setAttribute('y1', center.toString());
    this.minuteHand.setAttribute('x2', center.toString());
    this.minuteHand.setAttribute('y2', (center - radius * 0.7).toString());
    this.minuteHand.setAttribute('stroke', accent);
    this.minuteHand.setAttribute('stroke-width', '2');
    this.minuteHand.setAttribute('stroke-linecap', 'round');
    this.minuteHand.setAttribute('transform-origin', `${center} ${center}`);
    svg.appendChild(this.minuteHand);

    // Second hand (optional)
    if (this.options.showSeconds) {
      this.secondHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.secondHand.setAttribute('x1', center.toString());
      this.secondHand.setAttribute('y1', center.toString());
      this.secondHand.setAttribute('x2', center.toString());
      this.secondHand.setAttribute('y2', (center - radius * 0.8).toString());
      this.secondHand.setAttribute('stroke', accent);
      this.secondHand.setAttribute('stroke-width', '1');
      this.secondHand.setAttribute('stroke-linecap', 'round');
      this.secondHand.setAttribute('transform-origin', `${center} ${center}`);
      svg.appendChild(this.secondHand);
    }

    // Center pin
    this.centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.centerPin.setAttribute('cx', center.toString());
    this.centerPin.setAttribute('cy', center.toString());
    this.centerPin.setAttribute('r', '4');
    this.centerPin.setAttribute('fill', accent);
    svg.appendChild(this.centerPin);

    // Add text fallback for unsupported SVG
    const fallback = document.createElement('div');
    fallback.style.display = 'none';
    fallback.style.fontSize = '14px';
    fallback.style.fontFamily = 'monospace';
    fallback.style.textAlign = 'center';
    fallback.style.padding = '8px';
    fallback.setAttribute('aria-label', ariaLabel);
    fallback.textContent = '00:00';

    this.container.innerHTML = '';
    this.container.appendChild(svg);
    this.container.appendChild(fallback);

    // Check SVG support
    if (!svg.getBBox) {
      svg.style.display = 'none';
      fallback.style.display = 'block';
    }
  }

  private setupVisibilityListener(): void {
    const handleVisibilityChange = () => {
      this.isVisible = !document.hidden;
      
      if (this.isVisible) {
        // Resume and realign to current time
        this.updateClock();
        this.startTimer();
      } else {
        // Pause timers
        this.stopTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private startTimer(): void {
    this.stopTimer(); // Clear any existing timer
    
    if (!this.isVisible) return;

    const now = new Date();
    const nextUpdate = this.options.showSeconds 
      ? this.getNextSecondBoundary(now)
      : this.getNextMinuteBoundary(now);
    
    const delay = nextUpdate.getTime() - now.getTime();
    
    this.timerId = window.setTimeout(() => {
      this.updateClock();
      this.startTimer(); // Schedule next update
    }, delay);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private getNextMinuteBoundary(date: Date): Date {
    const next = new Date(date);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next;
  }

  private getNextSecondBoundary(date: Date): Date {
    const next = new Date(date);
    next.setMilliseconds(0);
    next.setSeconds(next.getSeconds() + 1);
    return next;
  }

  private updateClock(): void {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calculate angles (0° = 12 o'clock, clockwise)
    const hourAngle = (hours * 30 + minutes * 0.5) * (Math.PI / 180);
    const minuteAngle = minutes * 6 * (Math.PI / 180);
    const secondAngle = seconds * 6 * (Math.PI / 180);

    // Apply transforms
    this.hourHand.style.transform = `rotate(${hourAngle * (180 / Math.PI)}deg)`;
    this.minuteHand.style.transform = `rotate(${minuteAngle * (180 / Math.PI)}deg)`;
    
    if (this.secondHand) {
      this.secondHand.style.transform = `rotate(${secondAngle * (180 / Math.PI)}deg)`;
    }

    // Update text fallback
    const fallback = this.container.querySelector('div');
    if (fallback) {
      const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      fallback.textContent = timeString;
    }

  }

  /**
   * Update clock options
   */
  public updateOptions(newOptions: Partial<AnalogClockOptions>): void {
    const oldShowSeconds = this.options.showSeconds;
    this.options = { ...this.options, ...newOptions };

    // If seconds mode changed, recreate clock
    if (oldShowSeconds !== this.options.showSeconds) {
      this.createClock();
    }

    // Update colors
    const faceCircle = this.container.querySelector('circle');
    if (faceCircle) {
      faceCircle.setAttribute('fill', this.options.face);
      faceCircle.setAttribute('stroke', this.options.accent);
    }

    // Update hand colors
    [this.hourHand, this.minuteHand, this.secondHand].forEach(hand => {
      if (hand) {
        hand.setAttribute('stroke', this.options.accent);
      }
    });

    // Update center pin
    this.centerPin.setAttribute('fill', this.options.accent);

    // Update tick colors
    const ticks = this.container.querySelectorAll('line');
    ticks.forEach(tick => {
      tick.setAttribute('stroke', this.options.accent);
    });

    // Restart timer with new settings
    this.startTimer();
  }

  /**
   * Manually update the clock to current time
   */
  public forceUpdate(): void {
    this.updateClock();
  }

  /**
   * Destroy the clock and clean up resources
   */
  public destroy(): void {
    this.stopTimer();
    document.removeEventListener('visibilitychange', this.setupVisibilityListener);
    this.container.innerHTML = '';
  }

  /**
   * Get current clock options
   */
  public getOptions(): Readonly<AnalogClockOptions> {
    return { ...this.options };
  }
}

/**
 * Factory function to create a clock instance
 */
export function createAnalogClock(
  container: HTMLElement | string, 
  options: AnalogClockOptions = {}
): AnalogClock {
  const element = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
  
  if (!element) {
    throw new Error(`Container element not found: ${container}`);
  }

  return new AnalogClock(element, options);
}

/**
 * Auto-initialize clocks on page load
 */
export function autoInit(): void {
  document.addEventListener('DOMContentLoaded', () => {
    const clockElements = document.querySelectorAll('[data-analog-clock]');
    clockElements.forEach(element => {
      const options: AnalogClockOptions = {};
      
      // Parse data attributes
      if (element.hasAttribute('data-size')) {
        options.size = parseInt(element.getAttribute('data-size') || '160');
      }
      if (element.hasAttribute('data-accent')) {
        options.accent = element.getAttribute('data-accent') || '#0F172A';
      }
      if (element.hasAttribute('data-face')) {
        options.face = element.getAttribute('data-face') || '#FFFFFF';
      }
      if (element.hasAttribute('data-show-seconds')) {
        options.showSeconds = element.getAttribute('data-show-seconds') === 'true';
      }
      if (element.hasAttribute('data-aria-label')) {
        options.ariaLabel = element.getAttribute('data-aria-label') || 'Analog clock';
      }

      createAnalogClock(element as HTMLElement, options);
    });
  });
}

