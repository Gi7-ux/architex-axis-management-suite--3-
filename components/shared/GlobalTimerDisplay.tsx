import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import { AuthUser } from '../../types'; // Uncomment if you actually use AuthUser type in this file
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
      // Function to calculate and set elapsed time
      const updateCurrentElapsedTime = () => {
        const now = new Date().getTime();
        const start = new Date(activeTimerInfo.startTime).getTime();
        setElapsedTime(Math.max(0, Math.floor((now - start) / 1000)));
      };

      updateCurrentElapsedTime(); // Calculate and set immediately when timer info is active

      const intervalId = window.setInterval(updateCurrentElapsedTime, 1000);
      intervalRef.current = intervalId;
      reminderShownRef.current = {}; // Reset reminders when a new timer starts

      return () => {
        window.clearInterval(intervalId);
        intervalRef.current = null;
      };
    } else {
      // Timer is not active
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedTime(0); // Reset elapsed time to 0
    }
  }, [activeTimerInfo]); // Effect depends only on activeTimerInfo presence/change

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
        <div className="text-lg font-bold" data-testid="elapsed-time-display">{formatDurationToHHMMSS(elapsedTime)}</div>
        {/* The ternary operator was: {elapsedTime !== null ? formatDurationToHHMMSS(elapsedTime) : '00:00:00'}
            Since elapsedTime is initialized to 0 and is a number, it won't be null.
            This simplifies to formatDurationToHHMMSS(elapsedTime).
        */}
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
