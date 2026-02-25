import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Star, Circle } from "lucide-react";

interface ClassSession {
  id: number;
  session_date: string;
  branch: string;
  course: string | null;
  level: string | null;
  batch_name: string | null;
  topic: string | null;
  is_completed: boolean;
}

interface AttendanceRecord {
  id: number;
  session_id: number;
  status: "present" | "absent" | "on_break" | "leave";
  t_shirt_worn: boolean;
  session?: ClassSession;
}

interface CalendarProps {
  sessions: ClassSession[];
  attendanceRecords?: AttendanceRecord[];
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null;
  isStudentView?: boolean;
}

interface CalendarDayProps {
  date: Date;
  sessions: ClassSession[];
  attendance?: AttendanceRecord | null;
  isSelected: boolean;
  isToday: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  isStudentView: boolean;
}

// Helper function to normalize dates for comparison (fixes timezone issues)
const normalizeDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to compare dates (ignores time and timezone)
const isSameDate = (date1: Date, date2: Date): boolean => {
  return normalizeDate(date1) === normalizeDate(date2);
};

const CalendarDay = ({
  date,
  sessions,
  attendance,
  isSelected,
  isToday,
  isHovered,
  onClick,
  onHover,
  isStudentView
}: CalendarDayProps) => {
  const hasScheduledClass = sessions.length > 0;
  const hasAttendance = attendance !== null && attendance !== undefined;
  const hasTshirt = attendance?.t_shirt_worn === true;
  
  // Remove leave status - only show present/absent/break
  const attendanceStatus = attendance?.status === "leave" ? null : attendance?.status;

  // Determine status colors and styles
  const getStatusStyle = () => {
    if (attendanceStatus === "present") {
      return {
        border: "border-emerald-400/60 dark:border-emerald-500/60",
        bg: "bg-gradient-to-br from-emerald-50/90 via-green-50/90 to-emerald-50/90 dark:from-emerald-900/40 dark:via-green-900/40 dark:to-emerald-900/40",
        indicator: "bg-emerald-500 dark:bg-emerald-400",
        indicatorRing: "ring-emerald-300/50 dark:ring-emerald-500/30",
        dot: "bg-emerald-500 dark:bg-emerald-400"
      };
    } else if (attendanceStatus === "absent") {
      return {
        border: "border-red-400/60 dark:border-red-500/60",
        bg: "bg-gradient-to-br from-red-50/90 via-rose-50/90 to-red-50/90 dark:from-red-900/40 dark:via-rose-900/40 dark:to-red-900/40",
        indicator: "bg-red-500 dark:bg-red-400",
        indicatorRing: "ring-red-300/50 dark:ring-red-500/30",
        dot: "bg-red-500 dark:bg-red-400"
      };
    } else if (attendanceStatus === "on_break") {
      return {
        border: "border-amber-400/60 dark:border-amber-500/60",
        bg: "bg-gradient-to-br from-amber-50/90 via-orange-50/90 to-amber-50/90 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-amber-900/40",
        indicator: "bg-amber-500 dark:bg-amber-400",
        indicatorRing: "ring-amber-300/50 dark:ring-amber-500/30",
        dot: "bg-amber-500 dark:bg-amber-400"
      };
    }
    return null;
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
        group relative aspect-square p-2 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${isSelected
          ? "border-indigo-400/80 bg-gradient-to-br from-indigo-50/95 via-purple-50/95 to-pink-50/95 dark:from-indigo-900/70 dark:via-purple-900/70 dark:to-pink-900/70 shadow-xl shadow-indigo-500/25 scale-[1.02] ring-2 ring-indigo-300/60 dark:ring-indigo-500/40 z-10"
          : isToday
          ? "border-indigo-300/70 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 dark:from-indigo-900/50 dark:via-purple-900/50 dark:to-pink-900/50 shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-200/50 dark:ring-indigo-500/30"
          : statusStyle
          ? `${statusStyle.border} ${statusStyle.bg} ${isHovered ? "shadow-md scale-[1.01]" : ""}`
          : isHovered
          ? "border-slate-300/70 dark:border-slate-600/70 bg-gradient-to-br from-slate-50/90 to-slate-100/90 dark:from-slate-800/70 dark:to-slate-700/70 shadow-md scale-[1.01]"
          : "border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/50 hover:border-slate-300/60 dark:hover:border-slate-600/60 hover:bg-white/85 dark:hover:bg-slate-800/65"
        }
        backdrop-blur-sm
      `}
    >
      {/* Scheduled Class Background Tint */}
      {hasScheduledClass && !statusStyle && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/12 via-purple-500/12 to-pink-500/12 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20 rounded-xl" />
      )}

      <div className="relative flex flex-col h-full z-10">
        {/* Date number */}
        <div className={`
          text-sm font-black mb-auto transition-colors duration-300 flex-shrink-0 leading-none
          ${isToday
            ? "text-indigo-600 dark:text-indigo-300"
            : isSelected
            ? "text-indigo-700 dark:text-indigo-200"
            : statusStyle
            ? "text-slate-800 dark:text-slate-100"
            : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100"
          }
        `}>
          {date.getDate()}
        </div>

        {/* Indicators area - modular design */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-0 mt-1">
          {/* Admin View: Show count of scheduled classes */}
          {!isStudentView && hasScheduledClass && (
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/25 to-purple-500/25 dark:from-indigo-400/35 dark:to-purple-400/35 border border-indigo-300/40 dark:border-indigo-500/40 flex items-center justify-center backdrop-blur-sm">
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-200 leading-none">
                  {sessions.length}
                </span>
              </div>
            </div>
          )}

          {/* Student View: Modular attendance indicators */}
          {isStudentView && (
            <>
              {/* Present/Absent/Break Indicator - Modular dot with symbol */}
              {attendanceStatus && statusStyle && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`
                    w-3.5 h-3.5 rounded-full ${statusStyle.dot}
                    ring-2 ${statusStyle.indicatorRing}
                    shadow-sm flex items-center justify-center
                  `}>
                    <span className="text-[9px] font-black leading-none text-white">
                      {attendanceStatus === "present" ? "✓" : attendanceStatus === "absent" ? "✕" : "⏸"}
                    </span>
                  </div>
                </div>
              )}
              
              {/* No attendance but has scheduled class */}
              {!attendanceStatus && hasScheduledClass && (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400/60 dark:bg-slate-500/60 ring-1 ring-slate-300/30 dark:ring-slate-600/30" />
              )}
            </>
          )}
        </div>

        {/* T-shirt Star - Premium corner badge */}
        {isStudentView && hasTshirt && (
          <div className="absolute top-1.5 right-1.5 z-20">
            <div className="relative">
              <div className="w-3.5 h-3.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-500 dark:via-orange-600 dark:to-orange-700 rounded-full flex items-center justify-center shadow-md shadow-orange-500/40 ring-1 ring-orange-300/50 dark:ring-orange-400/30">
                <Star className="w-2 h-2 text-white fill-white" strokeWidth={2.5} />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 w-3.5 h-3.5 bg-orange-400/30 rounded-full blur-[2px] -z-10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarLegend = ({ isStudentView }: { isStudentView: boolean }) => {
  const legendItems = [
    {
      icon: CalendarIcon,
      label: "Scheduled Class",
      bg: "from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/40 dark:to-purple-900/40",
      border: "border-indigo-200/60 dark:border-indigo-700/60",
      indicator: "w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
    },
    ...(isStudentView ? [
      {
        icon: Circle,
        label: "Present",
        bg: "from-emerald-50/80 to-green-50/80 dark:from-emerald-900/40 dark:to-green-900/40",
        border: "border-emerald-200/60 dark:border-emerald-700/60",
        indicator: "w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-2 ring-emerald-300/50 dark:ring-emerald-500/30 flex items-center justify-center",
        symbol: "✓"
      },
      {
        icon: Circle,
        label: "Absent",
        bg: "from-red-50/80 to-rose-50/80 dark:from-red-900/40 dark:to-rose-900/40",
        border: "border-red-200/60 dark:border-red-700/60",
        indicator: "w-3 h-3 rounded-full bg-red-500 dark:bg-red-400 ring-2 ring-red-300/50 dark:ring-red-500/30 flex items-center justify-center",
        symbol: "✕"
      },
      {
        icon: Circle,
        label: "Break",
        bg: "from-amber-50/80 to-orange-50/80 dark:from-amber-900/40 dark:to-orange-900/40",
        border: "border-amber-200/60 dark:border-amber-700/60",
        indicator: "w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-400 ring-2 ring-amber-300/50 dark:ring-amber-500/30 flex items-center justify-center",
        symbol: "⏸"
      },
      {
        icon: Star,
        label: "T-shirt Worn",
        bg: "from-orange-50/80 to-orange-50/80 dark:from-orange-900/40 dark:to-orange-900/40",
        border: "border-orange-200/60 dark:border-orange-700/60",
        indicator: "w-3 h-3 rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center shadow-sm ring-1 ring-orange-300/50 dark:ring-orange-400/30"
      }
    ] : [])
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border/40">
      {legendItems.map((item, index) => {
        return (
          <div
            key={index}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${item.bg} rounded-xl border ${item.border} backdrop-blur-sm shadow-sm transition-all hover:scale-105`}
          >
            {item.symbol ? (
              <div className={item.indicator}>
                <span className="text-[8px] text-white font-bold leading-none">{item.symbol}</span>
              </div>
            ) : item.icon === Star ? (
              <div className={item.indicator}>
                <Star className="w-2 h-2 text-white fill-white" strokeWidth={2.5} />
              </div>
            ) : (
              <div className={item.indicator} />
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function AttendanceCalendar({
  sessions,
  attendanceRecords = [],
  onDateClick,
  selectedDate,
  isStudentView = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthData = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Count sessions in this month using normalized date comparison
    const sessionsThisMonth = sessions.filter((session) => {
      const sessionDate = new Date(session.session_date);
      return (
        sessionDate.getFullYear() === currentMonth.getFullYear() &&
        sessionDate.getMonth() === currentMonth.getMonth()
      );
    });

    return {
      sessionsThisMonth,
      firstDay,
      lastDay,
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
      adjustedStartingDay: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    };
  }, [currentMonth, sessions]);

  const isSelectedDateToday = selectedDate ? (() => {
    const today = new Date();
    return isSameDate(selectedDate, today);
  })() : false;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Fixed date comparison using normalized dates
  const getSessionsForDate = (date: Date): ClassSession[] => {
    const normalizedTarget = normalizeDate(date);
    return sessions.filter((session) => {
      const sessionDate = new Date(session.session_date);
      const normalizedSession = normalizeDate(sessionDate);
      return normalizedSession === normalizedTarget;
    });
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | null => {
    if (!isStudentView || attendanceRecords.length === 0) return null;
    const normalizedTarget = normalizeDate(date);
    return attendanceRecords.find((record) => {
      if (!record.session) return false;
      const sessionDate = new Date(record.session.session_date);
      const normalizedSession = normalizeDate(sessionDate);
      return normalizedSession === normalizedTarget;
    }) || null;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return isSameDate(date, today);
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return isSameDate(date, selectedDate);
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();

    // Empty cells for days before month starts
    for (let i = 0; i < monthData.adjustedStartingDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= monthData.daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateSessions = getSessionsForDate(date);
      const attendance = getAttendanceForDate(date);

      days.push(
        <CalendarDay
          key={day}
          date={date}
          sessions={dateSessions}
          attendance={attendance}
          isSelected={isSelected(date)}
          isToday={isToday(date)}
          isHovered={hoveredDate?.getTime() === date.getTime()}
          onClick={() => onDateClick?.(date)}
          onHover={(hovered) => setHoveredDate(hovered ? date : null)}
          isStudentView={isStudentView}
        />
      );
    }

    return days;
  };

  return (
    <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 border border-border/80 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20 backdrop-blur-sm transition-all duration-500 w-full overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/60">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg ring-2 ring-indigo-200/50 dark:ring-indigo-500/30">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 mb-1">
              Attendance Calendar
            </h2>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
                {monthData.sessionsThisMonth.length} {monthData.sessionsThisMonth.length === 1 ? "class" : "classes"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2.5 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 border border-slate-200/50 dark:border-slate-700/50"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              onDateClick?.(today);
            }}
            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 border border-indigo-400/50"
          >
            {isSelectedDateToday ? "Today" : selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Today"}
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2.5 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 border border-slate-200/50 dark:border-slate-700/50"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-black text-slate-600 dark:text-slate-300 py-2.5 bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-800/60 dark:to-slate-700/60 rounded-lg border border-slate-200/40 dark:border-slate-700/40 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2.5 mb-6">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <CalendarLegend isStudentView={isStudentView} />
    </div>
  );
}
