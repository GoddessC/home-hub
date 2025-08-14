import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactConfetti from 'react-confetti';
import useWindowSize from '@/hooks/use-window-size';

interface ConfettiCelebrationProps {
  onComplete: () => void;
}

export const ConfettiCelebration = ({ onComplete }: ConfettiCelebrationProps) => {
  const { width, height } = useWindowSize();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return ReactDOM.createPortal(
    <ReactConfetti
      width={width}
      height={height}
      numberOfPieces={400}
      gravity={0.12}
      initialVelocityY={15}
      recycle={false}
      onConfettiComplete={onComplete}
      run={true}
      colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']}
      style={{ zIndex: 100, position: 'fixed', top: 0, left: 0 }}
    />,
    document.body
  );
};