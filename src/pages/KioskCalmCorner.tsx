import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarryNight } from '@/components/effects/StarryNight';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const PHASES = [
  { text: 'Breathe in... 2... 3... 4', duration: 4000 },
  { text: 'Hold your breath... 2... 3... 4', duration: 4000 },
  { text: 'Breathe out... 2... 3... 4', duration: 4000 },
  { text: 'Hold your breath... 2... 3... 4', duration: 4000 },
];
const TOTAL_CYCLES = 5;
const DURATION_SECONDS = TOTAL_CYCLES * 16;

const KioskCalmCorner = () => {
  const navigate = useNavigate();
  const { household } = useAuth();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const logUsage = async () => {
    if (!household) return;
    await supabase.from('calm_corner_log').insert({
      household_id: household.id,
      duration_seconds: DURATION_SECONDS,
    });
  };

  const handleExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => navigate('/kiosk'), 1000); // Allow fade-out animation
  };

  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(handleExit, 3000); // Show message for 3s
      return () => clearTimeout(timer);
    }

    if (cycleCount >= TOTAL_CYCLES) {
      logUsage();
      setIsFinished(true);
      return;
    }

    const currentPhase = PHASES[phaseIndex];
    const timer = setTimeout(() => {
      const nextPhaseIndex = (phaseIndex + 1) % PHASES.length;
      setPhaseIndex(nextPhaseIndex);
      if (nextPhaseIndex === 0) {
        setCycleCount(prev => prev + 1);
      }
    }, currentPhase.duration);

    return () => clearTimeout(timer);
  }, [phaseIndex, cycleCount, isFinished]);

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center text-white transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      <StarryNight />
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {!isFinished ? (
          <>
            <div className="relative w-64 h-64 mb-12">
              <div className="absolute w-full h-full border-2 border-white/20 rounded-lg"></div>
              <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_12px_4px_rgba(255,255,255,0.7)] animate-box-breathing"></div>
            </div>
            <p className="text-4xl font-bold animate-fade-in">{PHASES[phaseIndex].text}</p>
          </>
        ) : (
          <p className="text-5xl font-bold animate-fade-in">You did great.</p>
        )}
      </div>
      <Button
        variant="ghost"
        className="absolute bottom-8 z-20 text-white/50 hover:text-white hover:bg-white/10"
        onClick={handleExit}
      >
        I'm Done
      </Button>
    </div>
  );
};

export default KioskCalmCorner;