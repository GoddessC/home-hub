import { useState, useEffect, useMemo } from 'react';
import Confetti from 'react-confetti';
import { Quest } from '@/components/dashboard/TeamQuestPanel';
import { PartyPopper } from 'lucide-react';
import { useWindowSize } from '@uidotdev/usehooks';

interface QuestCompleteCelebrationProps {
  quest: Quest;
  onComplete: () => void;
}

export const QuestCompleteCelebration = ({ quest, onComplete }: QuestCompleteCelebrationProps) => {
  const [stage, setStage] = useState(0);
  const { width, height } = useWindowSize();

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 2500); // Show points
    const t2 = setTimeout(() => setStage(2), 5000); // Show members
    const t3 = setTimeout(onComplete, 8000); // End celebration

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const participants = useMemo(() => {
    if (!quest?.quest_sub_tasks) return [];
    const memberMap = new Map();
    quest.quest_sub_tasks.forEach(task => {
      if (task.members) {
        memberMap.set(task.members.id, task.members);
      }
    });
    return Array.from(memberMap.values());
  }, [quest]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in text-white">
      {width && height && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={stage < 2 ? 250 : 0}
          recycle={false}
          gravity={0.15}
        />
      )}
      <div className="relative text-center">
        {/* Stage 0: Initial Title */}
        <div className={`transition-opacity duration-500 ${stage === 0 ? 'opacity-100' : 'opacity-0'}`}>
          <PartyPopper className="h-32 w-32 text-yellow-300 mx-auto animate-bounce" />
          <h1 className="text-6xl font-bold mt-4 tracking-tight">QUEST COMPLETE!</h1>
          <p className="text-2xl text-gray-300 mt-2">{quest.name}</p>
        </div>

        {/* Stage 1: Points Reveal */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${stage === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`}>
          <div className="text-8xl font-bold text-yellow-300" style={{ textShadow: '0 0 20px rgba(252, 211, 77, 0.7)' }}>
            +{quest.reward_points_each} PTS!
          </div>
        </div>

        {/* Stage 2: Member Distribution */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${stage === 2 ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-4xl font-bold">Rewards Distributed!</h2>
            <div className="mt-6 flex justify-center gap-8">
                {participants.map(p => (
                    <div key={p.id} className="text-center p-4 bg-white/10 rounded-lg">
                        <p className="font-bold text-lg">{p.full_name}</p>
                        <p className="text-yellow-300 font-semibold text-xl">+{quest.reward_points_each} pts</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};