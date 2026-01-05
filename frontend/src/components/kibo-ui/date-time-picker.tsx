"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, Clock, X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
  MiniCalendarHeader,
} from "./mini-calendar";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

interface DateTimePickerProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  className,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  });
  const [hours, setHours] = useState(() => {
    if (selectedDate) {
      return selectedDate.getHours().toString().padStart(2, "0");
    }
    return "12";
  });
  const [minutes, setMinutes] = useState(() => {
    if (selectedDate) {
      return selectedDate.getMinutes().toString().padStart(2, "0");
    }
    return "00";
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setHours(date.getHours().toString().padStart(2, "0"));
        setMinutes(date.getMinutes().toString().padStart(2, "0"));
      }
    } else {
      setSelectedDate(null);
      setHours("12");
      setMinutes("00");
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    setSelectedDate(newDate);
    
    // Format as ISO string for datetime-local compatibility
    const isoString = formatDateTimeLocal(newDate);
    onChange?.(isoString);
  }, [hours, minutes, onChange]);

  const handleTimeChange = useCallback((newHours: string, newMinutes: string) => {
    setHours(newHours);
    setMinutes(newMinutes);
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0);
      setSelectedDate(newDate);
      
      const isoString = formatDateTimeLocal(newDate);
      onChange?.(isoString);
    }
  }, [selectedDate, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    setHours("12");
    setMinutes("00");
    onChange?.(null);
  }, [onChange]);

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 border-2 border-gray-50 dark:border-gray-800 rounded-2xl",
          "bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white",
          "focus:border-indigo-500/50 outline-none transition-all text-sm text-left",
          "flex items-center justify-between gap-2",
          isOpen && "border-indigo-500/50"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={cn(
            "truncate",
            !selectedDate && "text-gray-400"
          )}>
            {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
          </span>
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 right-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <MiniCalendar
            value={selectedDate}
            onChange={handleDateSelect}
            minDate={minDate}
            maxDate={maxDate}
            className="w-full"
          >
            <MiniCalendarHeader />
            <MiniCalendarDays>
              {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
            </MiniCalendarDays>
            
            {/* Time Picker */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <select
                  value={hours}
                  onChange={(e) => handleTimeChange(e.target.value, minutes)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500 font-bold">:</span>
                <select
                  value={minutes}
                  onChange={(e) => handleTimeChange(hours, e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Done
            </button>
          </MiniCalendar>
        </div>
      )}
    </div>
  );
}

export default DateTimePicker;
