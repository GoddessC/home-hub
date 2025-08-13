import { useEffect } from 'react';
import { Rocket, PartyPopper } from 'lucide-react';

interface QuestCompleteCelebrationProps {
  onComplete: () => void;
}

export const QuestCompleteCelebration = ({ onComplete }: QuestCompleteCelebrationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000); // Show for 4 seconds

    // You could play a sound here too!
    // const audio = new Audio('/quest-complete.mp3');
    // audio.play();

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="text-center text-white">
        <div className="relative">
            <PartyPopper className="h-24 w-24 text-yellow-300 absolute -top-12 -left-16 animate-pulse" />
            <Rocket className="h-32 w-32 text-purple-400 animate-bounce" />
            <PartyPopper className="h-24 w-24 text-yellow-300 absolute -bottom-12 -right-16 animate-pulse [animation-delay:0.5s]" />
        </div>
        <h1 className="text-6xl font-bold mt-8 tracking-tight">QUEST COMPLETE!</h1>
        <p className="text-2xl text-muted-foreground mt-2">Great teamwork, everyone!</p>
      </div>
    </div>
  );
};