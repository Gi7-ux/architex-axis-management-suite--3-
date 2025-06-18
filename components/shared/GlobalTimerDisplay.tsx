import React, { useEffect, useState, useRef } from 'react';
import { useAuth, AuthUser } from '../AuthContext'; // Import AuthUser if needed for user type, or use UserRole directly
import Button from './Button';
import { StopIcon, ClockIcon } from './IconComponents';
import { UserRole } from '../../types'; // Import UserRole
import { formatDurationToHHMMSS } from '../../constants';

const TIMER_REMINDER_THRESHOLD_MINUTES = 1; // For testing, set to 60 for 1 hour in production

const GlobalTimerDisplay: React.FC = () => {
  const { user, activeTimerInfo, stopGlobalTimerAndLog } = useAuth(); // Add user
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const intervalRef = useRef<number | null>(null);
  const reminderShownRef = useRef<Record<number, boolean>>({}); // To track which reminders were shown

  useEffect(() => {
    if (activeTimerInfo) {
      const calculateElapsedTime = () => {
        const now = new Date();
        const start = new Date(activeTimerInfo.startTime);
        setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
      };

      calculateElapsedTime(); // Initial calculation
      intervalRef.current = window.setInterval(calculateElapsedTime, 1000); // Use window.setInterval
      reminderShownRef.current = {}; // Reset reminders when a new timer starts
    } else {
      if (intervalRef.current !== null) { // Check for null before clearing
        window.clearInterval(intervalRef.current); // Use window.clearInterval
        intervalRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (intervalRef.current !== null) { // Check for null before clearing
        window.clearInterval(intervalRef.current); // Use window.clearInterval
      }
    };
  }, [activeTimerInfo]);

  useEffect(() => {
    if (activeTimerInfo && elapsedTime > 0) {
      const elapsedMinutes = Math.floor(elapsedTime / 60);

      const checkAndShowReminder = (thresholdMinutes: number, reminderKey: number) => {
        if (elapsedMinutes >= thresholdMinutes && !reminderShownRef.current[reminderKey]) {
          reminderShownRef.current[reminderKey] = true;
          if (window.confirm(`Timer for '${activeTimerInfo.jobCardTitle}' has been running for ${thresholdMinutes} minute(s). Do you want to stop it?`)) {
            stopGlobalTimerAndLog("Timer stopped via reminder.");
          }
        }
      };
      
      checkAndShowReminder(TIMER_REMINDER_THRESHOLD_MINUTES, 1);
      checkAndShowReminder(TIMER_REMINDER_THRESHOLD_MINUTES * 2, 2); // Example for a second reminder

    }
  }, [elapsedTime, activeTimerInfo, stopGlobalTimerAndLog]);

  if (!activeTimerInfo || user?.role !== UserRole.FREELANCER) { // Add role check
    return null;
  }

  const handleStopTimer = async () => {
    const notes = prompt("Optional notes for this time entry (or leave blank):");
    await stopGlobalTimerAndLog(notes || undefined);
  };

  return (
    <div className="fixed top-2 right-2 md:top-4 md:right-4 z-[200] p-3 bg-red-600 text-white rounded-lg shadow-xl border-2 border-red-700 flashing-timer-border flex items-center space-x-3">
      <ClockIcon className="w-6 h-6 animate-pulse" />
      <div>
        <div className="text-xs font-medium">ACTIVE TIMER</div>
        <div className="text-lg font-bold">{formatDurationToHHMMSS(elapsedTime)}</div>
        <div className="text-xs truncate max-w-[150px] sm:max-w-[200px]" title={activeTimerInfo.jobCardTitle}>
          Task: {activeTimerInfo.jobCardTitle}
        </div>
      </div>
      <Button
        onClick={handleStopTimer}
        variant="danger"
        size="sm"
        className="!bg-red-700 hover:!bg-red-800 !px-2 !py-1"
        aria-label="Stop Timer"
      >
        <StopIcon className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default GlobalTimerDisplay;
