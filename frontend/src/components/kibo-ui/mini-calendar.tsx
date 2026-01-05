"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

// Types
interface MiniCalendarContextValue {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  minDate?: Date;
  maxDate?: Date;
}

interface MiniCalendarProps {
  children: ReactNode;
  value?: Date | null;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

interface MiniCalendarNavigationProps {
  direction: "prev" | "next";
  className?: string;
}

interface MiniCalendarDaysProps {
  children: (date: Date) => ReactNode;
  className?: string;
}

interface MiniCalendarDayProps {
  date: Date;
  className?: string;
}

// Context
const MiniCalendarContext = createContext<MiniCalendarContextValue | null>(null);

function useMiniCalendarContext() {
  const context = useContext(MiniCalendarContext);
  if (!context) {
    throw new Error("MiniCalendar components must be used within a MiniCalendar");
  }
  return context;
}

// Helper functions
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = firstDay.getDay();
  
  // Add days from previous month to fill the first week
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }
  
  // Add all days of the current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
  // Add days from next month to complete the last week
  const endDayOfWeek = lastDay.getDay();
  for (let i = 1; i <= 6 - endDayOfWeek; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// Components
export function MiniCalendar({ 
  children, 
  value, 
  onChange, 
  minDate, 
  maxDate,
  className 
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const onSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    onChange?.(date);
  }, [onChange]);

  const contextValue = useMemo(
    () => ({
      currentMonth,
      selectedDate,
      onSelect,
      goToPreviousMonth,
      goToNextMonth,
      minDate,
      maxDate,
    }),
    [currentMonth, selectedDate, onSelect, goToPreviousMonth, goToNextMonth, minDate, maxDate]
  );

  return (
    <MiniCalendarContext.Provider value={contextValue}>
      <div className={cn("w-full max-w-sm p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg", className)}>
        {children}
      </div>
    </MiniCalendarContext.Provider>
  );
}

export function MiniCalendarNavigation({ direction, className }: MiniCalendarNavigationProps) {
  const { goToPreviousMonth, goToNextMonth } = useMiniCalendarContext();

  if (direction === "prev") {
    return (
      <button
        type="button"
        onClick={goToPreviousMonth}
        className={cn(
          "p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
          className
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goToNextMonth}
      className={cn(
        "p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
        className
      )}
      aria-label="Next month"
    >
      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </button>
  );
}

export function MiniCalendarHeader({ className }: { className?: string }) {
  const { currentMonth } = useMiniCalendarContext();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <MiniCalendarNavigation direction="prev" />
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
      </h2>
      <MiniCalendarNavigation direction="next" />
    </div>
  );
}

export function MiniCalendarDays({ children, className }: MiniCalendarDaysProps) {
  const { currentMonth } = useMiniCalendarContext();
  
  const days = useMemo(
    () => getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={cn("", className)}>
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => children(date))}
      </div>
    </div>
  );
}

export function MiniCalendarDay({ date, className }: MiniCalendarDayProps) {
  const { currentMonth, selectedDate, onSelect, minDate, maxDate } = useMiniCalendarContext();

  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
  const isTodayDate = isToday(date);
  
  const isDisabled = useMemo(() => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  }, [date, minDate, maxDate]);

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect(date)}
      disabled={isDisabled}
      className={cn(
        "aspect-square flex items-center justify-center text-sm rounded-xl transition-all",
        isCurrentMonth
          ? "text-gray-900 dark:text-white"
          : "text-gray-300 dark:text-gray-600",
        isSelected && "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30",
        !isSelected && isTodayDate && "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold",
        !isSelected && !isTodayDate && isCurrentMonth && "hover:bg-gray-100 dark:hover:bg-gray-800",
        isDisabled && "opacity-30 cursor-not-allowed",
        className
      )}
    >
      {date.getDate()}
    </button>
  );
}

export { useMiniCalendarContext };
