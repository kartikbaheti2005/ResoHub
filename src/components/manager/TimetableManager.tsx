import React, { useState, useEffect } from 'react';
import { TimetableEntry, Resource, DayOfWeek } from '../../types';
import { api } from '../../lib/api';
import { Calendar, Plus, Trash2, Clock, BookOpen, GraduationCap, Building2, Search, Filter } from 'lucide-react';

interface Props {
  resources: Resource[];
}

export const TimetableManager: React.FC<Props> = ({ resources }) => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<string>('ALL');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [resourceId, setResourceId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [classSection, setClassSection] = useState('CSE-3A');
  const [subject, setSubject] = useState('Data Structures Lab');
  const [faculty, setFaculty] = useState('Prof. Sunita Sharma');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const data = await api.getTimetable();
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !subject.trim()) {
      setError('Resource and Subject are required');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.addTimetableEntry({
        resourceId,
        dayOfWeek,
        startTime,
        endTime,
        classSection,
        subject,
        faculty,
        academicYear: '2026-2027',
      });
      setShowAddModal(false);
      fetchTimetable();
    } catch (err: any) {
      setError(err.message || 'Failed to add timetable entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    try {
      await api.deleteTimetableEntry(id);
      fetchTimetable();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let filteredEntries = entries;
  if (selectedResourceFilter !== 'ALL') {
    filteredEntries = filteredEntries.filter((e) => e.resourceId === selectedResourceFilter);
  }
  if (selectedDayFilter !== 'ALL') {
    filteredEntries = filteredEntries.filter((e) => e.dayOfWeek === selectedDayFilter);
  }

  return (
    <div id="timetable-manager-container" className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <span>College Timetable Integration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain regular weekly class & lab schedules. ResoHub uses this to automatically block resource availability during class hours.
          </p>
        </div>

        <button
          id="btn-add-timetable-slot"
          onClick={() => {
            setResourceId(resources[0]?.id || '');
            setError(null);
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timetable Slot</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">Filter Schedule:</span>
        </div>

        <select
          id="filter-timetable-resource"
          value={selectedResourceFilter}
          onChange={(e) => setSelectedResourceFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="ALL">All Resources</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          id="filter-timetable-day"
          value={selectedDayFilter}
          onChange={(e) => setSelectedDayFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="ALL">All Days</option>
          {days.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <span className="text-slate-400 ml-auto font-medium">
          Showing {filteredEntries.length} schedule entries
        </span>
      </div>

      {/* Timetable Slots Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading college timetable...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">No Timetable Entries Found</p>
          <p className="text-xs text-slate-400 mt-1">Add class schedules to prevent booking conflicts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                    {entry.dayOfWeek}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {entry.startTime} - {entry.endTime}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{entry.subject}</span>
                </h4>

                <div className="space-y-1 text-xs text-slate-600 mt-2">
                  <p className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{entry.resourceName}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Class: <strong className="text-slate-800">{entry.classSection}</strong></span>
                  </p>
                  <p className="text-[11px] text-slate-500 pl-5">
                    Faculty: {entry.faculty}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Slot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Timetable Class Slot</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">Select Resource *</label>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.location})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Day of Week *</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Start Time *</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">End Time *</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Class / Section *</label>
                  <input
                    type="text"
                    value={classSection}
                    onChange={(e) => setClassSection(e.target.value)}
                    placeholder="e.g. CSE-3A"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Data Structures Lab"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Faculty Name</label>
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="Prof. Sunita Sharma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg"
                >
                  Save Timetable Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
