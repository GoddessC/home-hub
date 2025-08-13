import { useMemo } from 'react';

export const StarryNight = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => (
      <div
        key={i}
        className="absolute bg-white rounded-full animate-twinkle"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          animationDelay: `${Math.random() * 7}s`,
          animationDuration: `${Math.random() * 5 + 5}s`,
        }}
      />
    ));
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-gray-900 to-blue-900 overflow-hidden animate-fade-in">
      {stars}
    </div>
  );
};