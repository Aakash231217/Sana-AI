"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Calendar,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  HOLIDAY: "bg-red-500/20 text-red-400 border-red-500/30",
  EXAM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MEETING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  FUNCTION: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  SPORTS: "bg-green-500/20 text-green-400 border-green-500/30",
  VACATION: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  OTHER: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function CalendarYearMaster() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEventType, setSelectedEventType] = useState("");
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [showForm, setShowForm] = useState(false);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const { data: events, isLoading, refetch } = api.school.getCalendarEvents.useQuery({
    month,
    year,
    eventType: selectedEventType || undefined,
    academicYear: academicYear || undefined,
  });

  const deleteMutation = api.school.deleteCalendarEvent.useMutation({
    onSuccess: () => refetch(),
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    if (!events) return [];
    return events.filter((e: any) => {
      const eventDate = new Date(e.date);
      return eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white min-w-[180px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Academic Year */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
          >
            <option value="">All Years</option>
            {getAcademicYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
          >
            <option value="">All Events</option>
            <option value="HOLIDAY">Holidays</option>
            <option value="EXAM">Exams</option>
            <option value="MEETING">Meetings</option>
            <option value="FUNCTION">Functions</option>
            <option value="SPORTS">Sports</option>
            <option value="VACATION">Vacations</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-slate-800/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-3 text-center text-slate-400 text-sm font-medium border-b border-white/5">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-white/5 p-2 ${day ? "hover:bg-white/5" : "bg-slate-800/20"}`}
              >
                {day && (
                  <>
                    <span className={`text-sm font-medium ${isToday ? "bg-pink-600 text-white w-7 h-7 rounded-full flex items-center justify-center" : "text-slate-300"}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map((event: any) => (
                        <div
                          key={event.id}
                          className={`text-xs px-2 py-1 rounded border cursor-pointer group relative ${EVENT_COLORS[event.eventType] || EVENT_COLORS.OTHER}`}
                        >
                          <span className="truncate block">{event.title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: event.id }); }}
                            className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-600 rounded-full items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_COLORS).map(([type, classes]) => (
          <div key={type} className={`text-xs px-3 py-1 rounded border ${classes}`}>
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      {/* Events List for Current Month */}
      {events && events.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Events This Month ({events.length})</h3>
          <div className="space-y-2">
            {events.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${EVENT_COLORS[event.eventType] || EVENT_COLORS.OTHER}`}>
                    {event.eventType}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">{event.title}</p>
                    {event.description && <p className="text-slate-500 text-xs">{event.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">
                    {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate({ id: event.id })}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Event Form */}
      {showForm && (
        <EventForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
          defaultMonth={month}
          defaultYear={year}
        />
      )}
    </div>
  );
}

function EventForm({
  onClose,
  onSuccess,
  defaultMonth,
  defaultYear,
}: {
  onClose: () => void;
  onSuccess: () => void;
  defaultMonth: number;
  defaultYear: number;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: `${defaultYear}-${String(defaultMonth + 1).padStart(2, "0")}-01`,
    endDate: "",
    eventType: "HOLIDAY" as const,
    isRecurring: false,
    academicYear: getDefaultAcademicYear(),
  });
  const [branchId, setBranchId] = useState("");

  const { data: branches } = api.school.getBranches.useQuery();

  const createMutation = api.school.createCalendarEvent.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      branchId: branchId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-lg w-full">
        <div className="border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Add Event
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Start Date *</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Event Type</label>
              <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
                <option value="HOLIDAY">Holiday</option>
                <option value="EXAM">Exam</option>
                <option value="MEETING">Meeting</option>
                <option value="FUNCTION">Function</option>
                <option value="SPORTS">Sports</option>
                <option value="VACATION">Vacation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Academic Year</label>
              <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
                {getAcademicYearOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
              <option value="">All Branches</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {createMutation.isPending ? "Creating..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}

function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Academic year typically starts in April
  if (month >= 3) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

function getAcademicYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const y = currentYear + i;
    options.push(`${y}-${y + 1}`);
  }
  return options;
}
