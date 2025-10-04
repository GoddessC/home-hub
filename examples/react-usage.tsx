/**
 * React Usage Examples for AnalogClock
 * Demonstrates the React wrapper component and hook usage
 */

import React, { useRef, useState } from 'react';
import { AnalogClockReact, useAnalogClock, AnalogClockRef } from '../src/AnalogClock.react';

// Example 1: Basic React Component
export function BasicClockExample() {
  return (
    <div>
      <h3>Basic Clock</h3>
      <AnalogClockReact size={160} />
    </div>
  );
}

// Example 2: Clock with Ref for Manual Control
export function ControlledClockExample() {
  const clockRef = useRef<AnalogClockRef>(null);
  const [size, setSize] = useState(160);
  const [showSeconds, setShowSeconds] = useState(false);

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    clockRef.current?.updateOptions({ size: newSize });
  };

  const handleSecondsToggle = () => {
    setShowSeconds(!showSeconds);
    clockRef.current?.updateOptions({ showSeconds: !showSeconds });
  };

  return (
    <div>
      <h3>Controlled Clock</h3>
      <AnalogClockReact
        ref={clockRef}
        size={size}
        showSeconds={showSeconds}
        accent="#3b82f6"
        face="#f8fafc"
      />
      <div style={{ marginTop: '16px' }}>
        <button onClick={() => handleSizeChange(120)}>Small</button>
        <button onClick={() => handleSizeChange(160)}>Medium</button>
        <button onClick={() => handleSizeChange(200)}>Large</button>
        <button onClick={handleSecondsToggle}>
          {showSeconds ? 'Hide' : 'Show'} Seconds
        </button>
      </div>
    </div>
  );
}

// Example 3: Using the Hook
export function HookExample() {
  const clockRef = useRef<AnalogClockRef>(null);
  const { updateOptions, forceUpdate, getOptions } = useAnalogClock(clockRef);

  const changeTheme = () => {
    const themes = [
      { accent: '#8b5cf6', face: '#ffffff' },
      { accent: '#f59e0b', face: '#fef3c7' },
      { accent: '#10b981', face: '#d1fae5' },
      { accent: '#ef4444', face: '#fee2e2' }
    ];
    
    const current = getOptions();
    const currentTheme = themes.find(t => t.accent === current.accent);
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    
    updateOptions(nextTheme);
  };

  return (
    <div>
      <h3>Hook Example</h3>
      <AnalogClockReact
        ref={clockRef}
        size={180}
        accent="#8b5cf6"
        face="#ffffff"
      />
      <div style={{ marginTop: '16px' }}>
        <button onClick={changeTheme}>Change Theme</button>
        <button onClick={forceUpdate}>Force Update</button>
      </div>
    </div>
  );
}

// Example 4: Dashboard with Multiple Clocks
export function DashboardExample() {
  const [clocks] = useState([
    { id: 'main', size: 200, showSeconds: true },
    { id: 'small', size: 120, showSeconds: false },
    { id: 'compact', size: 80, showSeconds: false }
  ]);

  return (
    <div>
      <h3>Dashboard with Multiple Clocks</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {clocks.map(clock => (
          <div key={clock.id} style={{ textAlign: 'center' }}>
            <h4>{clock.id.charAt(0).toUpperCase() + clock.id.slice(1)}</h4>
            <AnalogClockReact
              size={clock.size}
              showSeconds={clock.showSeconds}
              accent="#0F172A"
              face="#FFFFFF"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Responsive Clock
export function ResponsiveClockExample() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getResponsiveSize = () => {
    if (windowWidth < 480) return 120;
    if (windowWidth < 768) return 160;
    if (windowWidth < 1024) return 200;
    return 240;
  };

  return (
    <div>
      <h3>Responsive Clock</h3>
      <p>Size: {getResponsiveSize()}px (Window: {windowWidth}px)</p>
      <AnalogClockReact
        size={getResponsiveSize()}
        accent="#059669"
        face="#f0fdf4"
        showSeconds={windowWidth > 768}
      />
    </div>
  );
}

// Example 6: Clock with Custom Styling
export function StyledClockExample() {
  return (
    <div>
      <h3>Styled Clock</h3>
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          borderRadius: '16px',
          display: 'inline-block'
        }}
      >
        <AnalogClockReact
          size={180}
          accent="#ffffff"
          face="rgba(255, 255, 255, 0.1)"
          showSeconds={true}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
        />
      </div>
    </div>
  );
}

// Example 7: Accessibility Features
export function AccessibilityExample() {
  return (
    <div>
      <h3>Accessibility Features</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h4>High Contrast</h4>
          <AnalogClockReact
            size={140}
            accent="#ffffff"
            face="#000000"
            ariaLabel="High contrast analog clock"
          />
        </div>
        <div>
          <h4>Reduced Motion</h4>
          <AnalogClockReact
            size={140}
            accent="#0F172A"
            face="#FFFFFF"
            reducedMotion={true}
            ariaLabel="Analog clock with reduced motion"
          />
        </div>
        <div>
          <h4>Large Size</h4>
          <AnalogClockReact
            size={200}
            accent="#0F172A"
            face="#FFFFFF"
            ariaLabel="Large analog clock for better visibility"
          />
        </div>
      </div>
    </div>
  );
}

// Main Demo Component
export function ReactExamplesDemo() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🕐 Analog Clock - React Examples</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <BasicClockExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <ControlledClockExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <HookExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <DashboardExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <ResponsiveClockExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <StyledClockExample />
      </div>
      
      <div style={{ marginBottom: '40px' }}>
        <AccessibilityExample />
      </div>
    </div>
  );
}

export default ReactExamplesDemo;

