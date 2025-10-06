import React, { useEffect, useRef } from 'react';
import { Member } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MemberDashboardPanel } from './MemberDashboardPanel';
import { cn } from '@/lib/utils';

interface MemberDetailsPanelProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  chores: any[];
}

export const MemberDetailsPanel: React.FC<MemberDetailsPanelProps> = ({
  member,
  isOpen,
  onClose,
  chores,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Focus the close button when panel opens
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const focusableElements = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!member) return null;

  return (
    <>
      {/* Backdrop */}
      {/* <div
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      /> */}

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-details-title"
        className={cn(
          "fixed left-0 right-0 top-0 z-20 bg-white dark:bg-gray-900",
          "border-t border-gray-200 dark:border-gray-700",
          "transition-transform duration-300 ease-out",
          "h-full overflow-y-auto",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2
            id="member-details-title"
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {member.full_name}
          </h2>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close member details"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 h-3/4">
          <MemberDashboardPanel
            member={member}
            chores={chores}
            isExpanded={true}
            onToggleExpanded={() => {}}
          />
        </div>
      </div>
    </>
  );
};
