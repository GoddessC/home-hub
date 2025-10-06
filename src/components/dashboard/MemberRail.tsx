import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Member } from '@/context/AuthContext';
import { MemberAvatar } from '@/components/avatar/MemberAvatar';
import { getMemberAvailablePoints } from '@/utils/pointsUtils';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// Animated Circular Progress Border Component
const AnimatedProgressBorder = ({ percentage, children, className }: { 
  percentage: number; 
  children: React.ReactNode; 
  className?: string; 
}) => {
  const circumference = 2 * Math.PI * 45; // radius of 45px
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${className}`}>
      {/* Background circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

interface MemberRailProps {
  members: Member[];
  onMemberSelect: (member: Member) => void;
  selectedMemberId?: string | null;
  chores?: any[];
}

interface MemberItemProps {
  member: Member;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
  availablePoints: number;
  completionPercentage: number;
}

const MemberItem: React.FC<MemberItemProps> = ({
  member,
  isActive,
  isSelected,
  onClick,
  onKeyDown,
  tabIndex,
  availablePoints,
  completionPercentage,
}) => {
  return (
    <AnimatedProgressBorder
      percentage={completionPercentage}
      className="flex-shrink-0"
    >
      <button
        id={`member-${member.id}`}
        role="option"
        aria-selected={isSelected}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn(
          "w-22 h-22 rounded-full border-2 border-transparent transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "flex flex-col items-center justify-center gap-1 p-2",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          isActive && "scale-106 shadow-lg shadow-gray-400/25",
          isSelected && "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
        )}
        style={{
          minWidth: '130px',
          minHeight: '130px',
          touchAction: 'manipulation',
        }}
      >
        <MemberAvatar memberId={member.id} className="w-12 h-12 mb-4" />
        <span className="text-xs font-medium text-center truncate max-w-16">
          {member.full_name.split(' ')[0]}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {availablePoints}pts
        </span>
        <span className="sr-only" aria-describedby={`member-${member.id}-desc`}>
          {member.full_name}, {availablePoints} points, {completionPercentage}% complete
        </span>
        <span id={`member-${member.id}-desc`} className="sr-only">
          {availablePoints} points available, {completionPercentage}% of tasks completed
        </span>
      </button>
    </AnimatedProgressBorder>
  );
};

export const MemberRail: React.FC<MemberRailProps> = ({
  members,
  onMemberSelect,
  selectedMemberId,
  chores = [],
}) => {
  // Calculate completion percentage for a member
  const getMemberCompletionPercentage = (memberId: string) => {
    if (!chores) return 0;
    const memberChores = chores.filter(c => c.member_id === memberId);
    if (memberChores.length === 0) return 0;
    const completedChores = memberChores.filter(c => c.completed_at).length;
    return Math.round((completedChores / memberChores.length) * 100);
  };
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const [announcement, setAnnouncement] = useState('');

  // Get available points for all members
  const { data: memberPoints } = useQuery({
    queryKey: ['member_points', members.map(m => m.id)],
    queryFn: async () => {
      const points = await Promise.all(
        members.map(async (member) => ({
          memberId: member.id,
          points: await getMemberAvailablePoints(member.id),
        }))
      );
      return points.reduce((acc, { memberId, points }) => {
        acc[memberId] = points;
        return acc;
      }, {} as Record<string, number>);
    },
    enabled: members.length > 0,
  });

  const railCenter = useCallback(() => {
    if (!railRef.current) return 0;
    const rect = railRef.current.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }, []);

  const itemCenter = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }, []);

  const findNearestItem = useCallback(() => {
    if (!railRef.current || members.length === 0) return 0;
    
    const items = railRef.current.querySelectorAll('[role="option"]');
    const center = railCenter();
    
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    items.forEach((item, index) => {
      const distance = Math.abs(itemCenter(item as HTMLElement) - center);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    return nearestIndex;
  }, [members.length, railCenter, itemCenter]);

  const setActive = useCallback((index: number, shouldScroll = true) => {
    const newIndex = Math.max(0, Math.min(index, members.length - 1));
    setActiveIndex(newIndex);
    
    if (shouldScroll && railRef.current) {
      const items = railRef.current.querySelectorAll('[role="option"]');
      const targetItem = items[newIndex] as HTMLElement;
      
      if (targetItem) {
        const center = railCenter();
        const itemCenterPos = itemCenter(targetItem);
        const scrollLeft = railRef.current.scrollLeft + (itemCenterPos - center);
        
        railRef.current.scrollTo({
          left: scrollLeft,
          behavior: 'smooth',
        });
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }
    
    // Announce selection change
    const member = members[newIndex];
    if (member) {
      const points = memberPoints?.[member.id] || 0;
      setAnnouncement(`${member.full_name} selected. ${points} points.`);
    }
  }, [members, railCenter, itemCenter, memberPoints]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      const nearestIndex = findNearestItem();
      if (nearestIndex !== activeIndex) {
        setActive(nearestIndex, false);
      }
    }, 80);
  }, [activeIndex, findNearestItem, setActive]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setActive(activeIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setActive(activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(members.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (members[activeIndex]) {
          onMemberSelect(members[activeIndex]);
        }
        break;
    }
  }, [activeIndex, members, setActive, onMemberSelect]);

  const handleItemClick = useCallback((index: number) => {
    setActive(index, true);
    // Small delay to allow animation to complete before selection
    setTimeout(() => {
      if (members[index]) {
        onMemberSelect(members[index]);
      }
    }, 200);
  }, [members, setActive, onMemberSelect]);

  // Initialize active member on mount
  useEffect(() => {
    if (selectedMemberId && members.length > 0) {
      const index = members.findIndex(m => m.id === selectedMemberId);
      if (index !== -1) {
        setActiveIndex(index);
      }
    }
  }, [selectedMemberId, members]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No members found</p>
          <p className="text-sm">Add members to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={railRef}
        role="listbox"
        aria-label="Members"
        aria-activedescendant={`member-${members[activeIndex]?.id || ''}`}
        className={cn(
          "flex gap-5 overflow-x-auto px-6 py-4",
          "scroll-snap-type-x-mandatory scroll-padding-inline-50%",
          "focus:outline-none"
        )}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: '50%',
        }}
      >
        {members.map((member, index) => (
          <MemberItem
            key={member.id}
            member={member}
            isActive={index === activeIndex}
            isSelected={member.id === selectedMemberId}
            onClick={() => handleItemClick(index)}
            onKeyDown={handleKeyDown}
            tabIndex={index === activeIndex ? 0 : -1}
            availablePoints={memberPoints?.[member.id] || 0}
            completionPercentage={getMemberCompletionPercentage(member.id)}
          />
        ))}
      </div>
      
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
};
