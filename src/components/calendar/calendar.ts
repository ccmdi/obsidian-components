import { Component, ComponentAction, ComponentInstance } from "components";
import { requestUrl, App } from "obsidian";
import { calendarStyles } from "./styles";

interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    description: string;
    location: string;
    url?: string;
}

interface CacheData {
    icsText: string;
    parsedEvents: CalendarEvent[];
    lastFetched: number;
}

interface FetchInfo {
    start: Date;
    end: Date;
}

interface ViewMap {
    [key: string]: string;
}

declare global {
    interface Window {
        FullCalendar: any;
        ICAL: any;
    }
}

export const calendar: Component<['calendarUrl', 'maxEvents', 'showWeekends', 'view', 'cached', 'hideHeader']> = {
    keyName: 'calendar',
    name: 'Calendar',
    args: {
        calendarUrl: {
            description: 'URL of the calendar to display',
            required: true
        },
        maxEvents: {
            description: 'Maximum number of events to display',
            default: '10'
        },
        showWeekends: {
            description: 'Show weekends',
            default: 'true'
        },
        view: {
            description: 'View of the calendar',
            default: 'month'
        },
        cached: {
            description: 'Use cached data',
            default: 'true'
        },
        hideHeader: {
            description: 'Hide the header',
            default: 'false'
        }
    },
    isMountable: false,
    styles: calendarStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const calendarUrl = args.calendarUrl;
        const maxEvents = parseInt(args.maxEvents);
        const showWeekends = args.showWeekends === 'true';
        const useCache = args.cached !== 'false';
        const hideHeader = args.hideHeader !== 'false';

        const viewMap: ViewMap = {
            'month': 'dayGridMonth',
            'week': 'timeGridWeek',
            'day': 'timeGridDay',
            'timeline': 'timelineDay'
        };

        const view = args.view || 'week';

        const calendarContainer = el.createEl('div', { cls: 'calendar-container' });
        calendarContainer.style.height = (args.height as string) || '650px';
        calendarContainer.style.opacity = '1';

        let calendar: any = null;
        let icsCache: string | null = null;
        let parsedEventsCache: CalendarEvent[] | null = null;

        const getCacheKey = (url: string): string =>
            `calendar_cache_${btoa(url).replace(/[^a-zA-Z0-9]/g, '_')}`;

        const loadCache = async (): Promise<CacheData | null> => {
            if (!useCache) return null;
            try {
                const cacheKey = getCacheKey(calendarUrl);
                const dataPath = app.vault.configDir + '/plugins/components/calendar.json';
                const dataFile = await app.vault.adapter.read(dataPath);
                const data = JSON.parse(dataFile);
                return data[cacheKey] || null;
            } catch {
                return null;
            }
        };

        const saveCache = async (icsText: string, parsedEvents: CalendarEvent[] | null = null): Promise<void> => {
            if (!useCache) return;
            try {
                const cacheKey = getCacheKey(calendarUrl);
                const dataPath = `${app.vault.configDir}/plugins/components/calendar.json`
                let data: Record<string, CacheData> = {};
                try {
                    const dataFile = await app.vault.adapter.read(dataPath);
                    data = JSON.parse(dataFile);
                } catch {
                    console.error('Error loading cache');
                }
                data[cacheKey] = {
                    icsText,
                    parsedEvents: parsedEvents || parsedEventsCache || [],
                    lastFetched: Date.now()
                };
                await app.vault.adapter.write(dataPath, JSON.stringify(data, null, 2));
            } catch {
                console.error('Error saving cache');
            }
        };

        const loadLibraries = async (): Promise<{ FullCalendar: any; ICAL: any }> => {
            const loadPromises: Promise<any>[] = [];
            if (!window.FullCalendar) {
                loadPromises.push(new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
                    script.addEventListener('load', () => resolve(window.FullCalendar));
                    script.addEventListener('error', reject);
                    document.head.appendChild(script);
                }));
            }
            if (!window.ICAL) {
                loadPromises.push(new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/ical.js@1.5.0/build/ical.min.js';
                    script.addEventListener('load', () => resolve(window.ICAL));
                    script.addEventListener('error', reject);
                    document.head.appendChild(script);
                }));
            }
            await Promise.all(loadPromises);
            return { FullCalendar: window.FullCalendar, ICAL: window.ICAL };
        };

        const parseCalendarUrl = (url: string) => {
            const patterns = [
                /calendar\.google\.com\/calendar\/ical\/([^\/]+)\/([^\/]+)\/basic\.ics/,
                /calendar\.google\.com\/calendar\/embed\?src=([^&]+)/,
                /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
            ];
            for (let i = 0; i < patterns.length; i++) {
                const match = url.match(patterns[i]);
                if (match) {
                    if (i === 0) {
                        return { calendarId: decodeURIComponent(match[1]), privateKey: match[2], isPrivate: true };
                    } else {
                        return { calendarId: decodeURIComponent(match[1]), privateKey: null, isPrivate: false };
                    }
                }
            }
            return { calendarId: url, privateKey: null, isPrivate: false };
        };

        const fetchEvents = async (fetchInfo: FetchInfo): Promise<CalendarEvent[]> => {
            try {
                if (calendarUrl.includes('.ics')) {
                    return await fetchICSEvents(calendarUrl, fetchInfo);
                } else {
                    const { calendarId } = parseCalendarUrl(calendarUrl);
                    return await fetchJSONEvents(calendarId, fetchInfo);
                }
            } catch {
                return [];
            }
        };

        const fetchICSEvents = async (icsUrl: string, fetchInfo: FetchInfo): Promise<CalendarEvent[]> => {
            if (parsedEventsCache) {
                const rangeStart = fetchInfo.start;
                const rangeEnd = fetchInfo.end;
                return parsedEventsCache.filter(event => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    return eventStart <= rangeEnd && eventEnd >= rangeStart;
                });
            }

            const cachedData = await loadCache();

            if (cachedData) {
                icsCache = cachedData.icsText;

                // Use pre-parsed events if available, otherwise parse
                if (cachedData.parsedEvents) {
                    parsedEventsCache = cachedData.parsedEvents;
                } else {
                    parsedEventsCache = parseAllICSEvents(icsCache);
                }

                // Start background fetch to update cache (non-blocking)
                if (useCache) {
                    setTimeout(() => fetchAndUpdateCache(icsUrl), 0);
                }

                // Filter for current view
                const rangeStart = fetchInfo.start;
                const rangeEnd = fetchInfo.end;
                return parsedEventsCache.filter(event => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    return eventStart <= rangeEnd && eventEnd >= rangeStart;
                });
            }

            // No cache available, fetch directly
            const response = await requestUrl({ url: icsUrl, method: 'GET' });
            if (response.status !== 200) throw new Error(`ICS fetch error: ${response.status}`);

            icsCache = response.text;
            parsedEventsCache = parseAllICSEvents(response.text);

            if (useCache) {
                saveCache(response.text, parsedEventsCache);
            }

            const rangeStart = fetchInfo.start;
            const rangeEnd = fetchInfo.end;
            return parsedEventsCache.filter(event => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                return eventStart <= rangeEnd && eventEnd >= rangeStart;
            });
        };

        const parseAllICSEvents = (icsText: string): CalendarEvent[] => {
            const jcalData = window.ICAL.parse(icsText);
            const comp = new window.ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');
            const events: CalendarEvent[] = [];

            for (const vevent of vevents) {
                if (vevent.hasProperty('recurrence-id')) {
                    continue;
                }

                const event = new window.ICAL.Event(vevent);
                if (event.isRecurring()) {
                    // For recurring events, generate occurrences for next 2 years
                    const iterator = event.iterator();
                    const maxDate = new window.ICAL.Time.fromJSDate(new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000));
                    let next;
                    while ((next = iterator.next()) && next.compare(maxDate) <= 0) {
                        const occurrence = event.getOccurrenceDetails(next);
                        events.push({
                            id: `${event.uid}-${occurrence.startDate.toICALString()}`,
                            title: event.summary || 'No title',
                            start: occurrence.startDate.toJSDate().toISOString(),
                            end: occurrence.endDate.toJSDate().toISOString(),
                            allDay: event.startDate.isDate,
                            description: event.description || '',
                            location: event.location || ''
                        });
                    }
                } else {
                    events.push({
                        id: event.uid,
                        title: event.summary || 'No title',
                        start: event.startDate.toJSDate().toISOString(),
                        end: event.endDate.toJSDate().toISOString(),
                        allDay: event.startDate.isDate,
                        description: event.description || '',
                        location: event.location || ''
                    });
                }
            }
            return events;
        };

        const parseAllICSEventsWithWorker = (icsText: string, callback: (events: CalendarEvent[]) => void): void => {
            const workerCode = `
                // Import ICAL.js
                importScripts('https://cdn.jsdelivr.net/npm/ical.js@1.5.0/build/ical.min.js');

                self.onmessage = function(e) {
                    try {
                        const icsText = e.data;
                        const jcalData = ICAL.parse(icsText);
                        const comp = new ICAL.Component(jcalData);
                        const vevents = comp.getAllSubcomponents('vevent');
                        const events = [];

                        for (const vevent of vevents) {
                            if (vevent.hasProperty('recurrence-id')) {
                                continue;
                            }

                            const event = new ICAL.Event(vevent);
                            if (event.isRecurring()) {
                                const iterator = event.iterator();
                                const maxDate = new ICAL.Time.fromJSDate(new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000));
                                let next;
                                while ((next = iterator.next()) && next.compare(maxDate) <= 0) {
                                    const occurrence = event.getOccurrenceDetails(next);
                                    events.push({
                                        id: event.uid + '-' + occurrence.startDate.toICALString(),
                                        title: event.summary || 'No title',
                                        start: occurrence.startDate.toJSDate().toISOString(),
                                        end: occurrence.endDate.toJSDate().toISOString(),
                                        allDay: event.startDate.isDate,
                                        description: event.description || '',
                                        location: event.location || ''
                                    });
                                }
                            } else {
                                events.push({
                                    id: event.uid,
                                    title: event.summary || 'No title',
                                    start: event.startDate.toJSDate().toISOString(),
                                    end: event.endDate.toJSDate().toISOString(),
                                    allDay: event.startDate.isDate,
                                    description: event.description || '',
                                    location: event.location || ''
                                });
                            }
                        }

                        self.postMessage({ success: true, events: events });
                    } catch (error) {
                        self.postMessage({ success: false, error: error.message });
                    }
                };
            `;

            try {
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                const worker = new Worker(workerUrl);

                worker.onmessage = function(e) {
                    if (e.data.success) {
                        callback(e.data.events);
                    } else {
                        // Fallback to main thread parsing
                        callback(parseAllICSEvents(icsText));
                    }
                    worker.terminate();
                    URL.revokeObjectURL(workerUrl);
                };

                worker.onerror = function() {
                    // Fallback to main thread parsing
                    callback(parseAllICSEvents(icsText));
                    worker.terminate();
                    URL.revokeObjectURL(workerUrl);
                };

                // Send data to worker
                worker.postMessage(icsText);

            } catch {
                // Fallback to main thread parsing
                callback(parseAllICSEvents(icsText));
            }
        };

        const fetchAndUpdateCache = async (icsUrl: string): Promise<void> => {
            try {
                const response = await requestUrl({ url: icsUrl, method: 'GET' });
                if (response.status === 200) {
                    icsCache = response.text;

                    // Parse events with web worker
                    parseAllICSEventsWithWorker(response.text, (newEvents) => {
                        parsedEventsCache = newEvents;
                        if (calendar) {
                            calendar.refetchEvents();
                        }

                        // Save cache in background (non-blocking)
                        saveCache(response.text, parsedEventsCache).catch(() => {
                            // Silently handle cache save errors
                        });
                    });
                }
            } catch {
                // Silently handle background fetch errors
            }
        };

        const fetchJSONEvents = async (calendarId: string, fetchInfo: FetchInfo): Promise<CalendarEvent[]> => {
            const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
            const params = new URLSearchParams({
                timeMin: fetchInfo.start.toISOString(),
                timeMax: fetchInfo.end.toISOString(),
                maxResults: maxEvents.toString(),
                singleEvents: 'true',
                orderBy: 'startTime'
            });
            const response = await fetch(`${apiUrl}?${params}`);
            if (!response.ok) throw new Error(`Calendar fetch error: ${response.status} - Make sure the calendar is public`);
            const data = await response.json();
            return data.items?.map((event: any): CalendarEvent => ({
                id: event.id,
                title: event.summary || 'No title',
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                allDay: !event.start?.dateTime,
                description: event.description || '',
                location: event.location || '',
                url: event.htmlLink
            })) || [];
        };

        const initCalendar = async (): Promise<void> => {
            const { FullCalendar } = await loadLibraries();

            calendar = new FullCalendar.Calendar(calendarContainer, {
                initialView: viewMap[view],
                weekends: showWeekends,
                editable: false,
                selectable: false,
                height: 'auto',
                timeZone: 'local',
                displayEventTime: false,
                allDaySlot: false,
                stickyHeaderDates: false,
                viewDidMount: function() {
                    // Reset slotting for new views
                    if (calendar?.view?.type?.includes('timeGrid')) {
                        calendar.setOption('slotMinTime', '00:00:00');
                        calendar.setOption('slotMaxTime', '24:00:00');
                    }
                },
                events: function(fetchInfo: FetchInfo, successCallback: (events: CalendarEvent[]) => void, failureCallback: (error: Error) => void) {
                    fetchEvents(fetchInfo)
                        .then(events => {
                            successCallback(events);

                            // Apply slotting after events are loaded
                            if (calendar?.view?.type?.includes('timeGrid') && events.length > 0) {
                                const timedEvents = events.filter(e => !e.allDay);
                                if (timedEvents.length > 0) {
                                    let minTime = '24:00:00';
                                    let maxTime = '00:00:00';
                                    timedEvents.forEach(e => {
                                        const start = new Date(e.start).toTimeString().split(' ')[0];
                                        const end = new Date(e.end).toTimeString().split(' ')[0];
                                        if (start < minTime) minTime = start;
                                        if (end > maxTime) maxTime = end;
                                    });

                                    // Add 30 minute buffer before and after
                                    const minDate = new Date(`1970-01-01T${minTime}`);
                                    const maxDate = new Date(`1970-01-01T${maxTime}`);

                                    minDate.setMinutes(minDate.getMinutes() - 30);
                                    maxDate.setMinutes(maxDate.getMinutes() + 30);

                                    const bufferedMinTime = minDate.toTimeString().split(' ')[0];
                                    const bufferedMaxTime = maxDate.toTimeString().split(' ')[0];

                                    calendar.setOption('slotMinTime', bufferedMinTime);
                                    calendar.setOption('slotMaxTime', bufferedMaxTime);
                                }
                            }
                        })
                        .catch(error => failureCallback(error));
                },
            });
            calendar.render();
        };

        await initCalendar();

        ComponentInstance.addCleanup(instance, () => {
            if (calendar) calendar.destroy();
        });

        el.appendChild(calendarContainer);
    },
    does: [ComponentAction.EXTERNAL],
    settings: {}
};