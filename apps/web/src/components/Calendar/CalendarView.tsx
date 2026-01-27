'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, getDay } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useLocale } from 'next-intl';
import CalendarList from './CalendarList';
import CalendarSettings from './CalendarSettings';

const locales = {
  'en': enUS,
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Event {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
}

interface CalendarPreference {
  visible: boolean;
  isPublic?: boolean;
  publicSlug?: string;
}

export default function CalendarView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  // State is now a dictionary: { "cal_id": { visible: true }, ... }
  const [calendarSettings, setCalendarSettings] = useState<Record<string, CalendarPreference>>({});

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [publicId, setPublicId] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Ref to prevent initial save loop
  const isInitialMount = useRef(true);

  const locale = useLocale();

  // Load User Settings on Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/calendar/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.timezone) setTimezone(data.timezone);
          if (data.view) setView(data.view as View);
          if (data.calendars) {
            setCalendarSettings(data.calendars);
          }
          if (data.publicId) {
            setPublicId(data.publicId);
          }
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: any) => {
    try {
      await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
    saveSettings({ view: newView });
  };

  const handleCalendarToggle = (id: string, visible: boolean) => {
    const newSettings = {
      ...calendarSettings,
      [id]: { ...calendarSettings[id], visible }
    };
    setCalendarSettings(newSettings);

    if (!isInitialMount.current && !loadingSettings) {
      saveSettings({ calendars: { [id]: { visible } } });
    }
  };

  const handleCalendarSettingsUpdate = (id: string, updates: Partial<CalendarPreference>) => {
    const current = calendarSettings[id] || { visible: true };
    const newSettings = {
      ...calendarSettings,
      [id]: { ...current, ...updates }
    };
    setCalendarSettings(newSettings);

    if (!isInitialMount.current && !loadingSettings) {
      saveSettings({ calendars: { [id]: updates } });
    }
  };



  const handleSelectionChange = (visibleIds: string[]) => {
    // CalendarList sends us the list of ALL currently visible IDs
    // We need to diff or simply iterate to update our dictionary
    // NOTE: With the dictionary approach, CalendarList logic of "send array" is slightly mismatched
    // but we can adapt. Ideally CalendarList should just emit the TOGGLED id.
    // But preserving existing prop signature:

    // Since CalendarList doesn't know about previous dictionary state easily,
    // it might be cleaner to update CalendarList to accept the dictionary too, 
    // but let's just reconstruct the dictionary state for persistence.

    // However, to avoid "resetting" other hidden props in future, we should merge.
    // But since we only have 'visible' now, we can just infer simple visibility.

    // Actually, refactoring CalendarList to just notify of TOGGLE would be better,
    // but the requested refactor was mainly storage.
    // Let's assume CalendarList maintains its own "list of checked items" and sends us that list.
    // We then ensure our dictionary reflects that.

    // Better approach for efficiency:
    // Loop over keys in 'visibleIds' -> set visible: true
    // Loop over keys in 'calendarSettings' that are NOT in visibleIds -> set visible: false

    const newSettings = { ...calendarSettings };

    // Since we don't know the full list of ALL POSSIBLE calendars here (only events know them),
    // we rely on what we have. 
    // Actually, for the persistence to work robustly, we should just update the entries involved.

    // Current CalendarList implementation sends the FULL ARRAY of currently visible IDs.
    // We will perform a simplified diff:
    // 1. Mark provided IDs as visible: true
    // 2. We need to know which ones were UNCHECKED. 

    // SIMPLIFICATION:
    // Pass 'handleCalendarToggle' logic down or rewrite CalendarList to use dictionary?
    // User asked to clean up CalendarList logs.
    // Let's modify CalendarList to accept "initialSelection" as a dictionary?
    // Or just map array -> dictionary here.

    // Let's stick to array interface for generic compatibility, but effectively
    // we update our Map based on it.
  };

  // Re-evaluating: To fully support the dictionary model requested by user ("propiedad de cada calendario sea el id... visible true or false"),
  // I should probably update CalendarList to work with this structure or provide a simpler callback.
  // The User didn't explicitly ask to rewrite CalendarList logic, just "quitar logs".
  // But consistency matters.
  // Let's support the `onSelectionChange` (array) for now by converting it to our Map format for storage.

  // Function to sync array from CalendarList to our Map state
  const handleCalendarListUpdate = (selectedIds: string[]) => {
    // This function is tricky because we don't know the IDs of calendars that strictly exist but are unchecked
    // unless we have the full list of calendars available.
    // CalendarList fetches the list. CalendarView doesn't list them per se (only events).

    // Implementation strategy:
    // 1. We receive selectedIds (Visible).
    // 2. We want to persist this.
    // 3. We construct a partial update object for the changed items?
    //    Too hard to diff without previous state locally.

    // Let's do this: 
    // Update CalendarView to just update the local map 'setCalendarSettings'.
    // AND persist the changes.

    // To properly persist "visible: false", we need to know what was unchecked.
    // I will update CalendarList to accept a "onToggle" prop instead of "onSelectionChange"?
    // That would be cleaner. 

    // PLAN: Stick to `onSelectionChange` but use a helper to update state.
    // We will iterate over the new `selectedIds` and set visible=true.
    // But what about false?
    // We need to know the universe of keys.

    // Alternative: Just update the `visibleCalendars` computed derived from the map.
  };

  // Mark initial mount done after settings load
  useEffect(() => {
    if (!loadingSettings) {
      setTimeout(() => { isInitialMount.current = false; }, 500);
    }
  }, [loadingSettings]);


  const fetchEvents = async (start: Date, end: Date) => {
    try {
      const res = await fetch(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        const mappedEvents = data.map((item: any) => {
          let start: Date, end: Date;

          if (item.start.date) {
            const [y, m, d] = item.start.date.split('-').map(Number);
            start = new Date(y, m - 1, d);

            if (item.end.date) {
              const [ey, em, ed] = item.end.date.split('-').map(Number);
              end = new Date(ey, em - 1, ed);
            } else {
              end = new Date(start);
            }
          } else {
            start = new Date(item.start.dateTime);
            end = new Date(item.end.dateTime);
          }

          return {
            title: item.summary || 'No Title',
            start,
            end,
            allDay: !item.start.dateTime,
            resource: item.resource,
          };
        });
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Failed to fetch events', error);
    }
  };

  const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
    let startDate: Date, endDate: Date;
    if (Array.isArray(range)) {
      startDate = range[0];
      endDate = new Date(range[range.length - 1]);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = range.start;
      endDate = range.end;
    }
    fetchEvents(startDate, endDate);
  };

  // Initial fetch after settings are loaded
  useEffect(() => {
    if (!loadingSettings) {
      const now = new Date();
      let start = startOfWeek(now);
      let end = endOfWeek(now);

      if (view === Views.MONTH) {
        start = startOfMonth(now);
        end = endOfMonth(now);
        // Adjust to show full weeks in month view if needed by BigCalendar (usually it handles it, but fetching a bit more is safe)
        start = startOfWeek(start);
        end = endOfWeek(end);
      } else if (view === Views.DAY) {
        start = startOfDay(now);
        end = endOfDay(now);
      } else {
        // Week
        start = startOfWeek(now);
        end = endOfWeek(now);
      }

      fetchEvents(start, end);
    }
  }, [loadingSettings]); // Trigger once settings are done

  // Compute visible calendars from settings
  // If no settings exist for a calendar ID, default to TRUE (visible)
  const isVisible = (calId: string) => {
    const setting = calendarSettings[calId];
    // If setting exists, use it. If not, default to true.
    if (setting && setting.visible === false) return false;
    return true;
  };

  // But wait, for the initial load of CalendarList, we need to pass the list of Visible IDs.
  // This means we need to know the IDs to pass "initialSelection".
  // Since we default to TRUE, we need a way to pass "Explicitly False" to CalendarList?
  // CalendarList expects "list of selected". 

  // Issue: CalendarList fetches the calendars. It knows the IDs.
  // CalendarView only has the preferences map.
  // If I have a preference "cal_A: false", I should NOT pass "cal_A" to CalendarList.
  // If I have no preference for "cal_B", I implied true, so I SHOULD pass "cal_B"?
  // But CalendarView doesn't know "cal_B" exists until events form it load?

  // Solution: Update CalendarList to accept "preferences" dictionary properly?
  // User wanted cleanup. Let's make CalendarList accept `calendarPreferences` map.
  // This is much more robust.

  useEffect(() => {
    const filtered = events.filter(event => {
      const calId = event.resource?.calendarId;
      if (!calId) return false;
      return isVisible(calId);
    });
    setFilteredEvents(filtered);
  }, [events, calendarSettings]);


  const eventPropGetter = (event: Event) => {
    const bg = event.resource?.backgroundColor || '#3174ad';
    const fg = event.resource?.foregroundColor || '#ffffff';
    return {
      style: {
        backgroundColor: bg,
        color: fg,
        borderColor: bg,
      }
    };
  };

  if (loadingSettings) {
    return <div className="h-[600px] flex items-center justify-center bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-gray-700"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-full flex flex-col">
          <CalendarList
            preferences={calendarSettings}
            onToggle={(id, visible) => handleCalendarToggle(id, visible)}
            onUpdateSettings={handleCalendarSettingsUpdate}
            userPublicId={publicId}
          />
          <CalendarSettings onTimezoneChange={setTimezone} />
        </div>
      </div>

      <div className="flex-1 h-[600px] bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={handleViewChange}
          date={date}
          onNavigate={setDate}
          onRangeChange={handleRangeChange}
          eventPropGetter={eventPropGetter}
          culture={locale}
          messages={{
            next: "Next",
            previous: "Back",
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day"
          }}
        />
      </div>
    </div>
  );
}
