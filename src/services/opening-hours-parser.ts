// OSM Opening Hours Parser
// Converts cryptic OSM format to readable structured data

export interface DayHours {
  day: string;
  fullDay: string;
  hours: string;
  isOpen: boolean;
  isClosed: boolean;
}

export interface ParsedHours {
  schedule: DayHours[];
  hasData: boolean;
  rawString: string;
  notes?: string;
}

class OpeningHoursParser {
  private dayMapping: Record<string, string> = {
    'Mo': 'Mon',
    'Tu': 'Tue', 
    'We': 'Wed',
    'Th': 'Thu',
    'Fr': 'Fri',
    'Sa': 'Sat',
    'Su': 'Sun',
    'PH': 'Holidays'
  };

  private fullDayMapping: Record<string, string> = {
    'Mo': 'Monday',
    'Tu': 'Tuesday',
    'We': 'Wednesday', 
    'Th': 'Thursday',
    'Fr': 'Friday',
    'Sa': 'Saturday',
    'Su': 'Sunday',
    'PH': 'Public Holidays'
  };

  /**
   * Parse OSM opening hours string into structured data
   */
  parseOpeningHours(hoursString: string): ParsedHours {
    if (!hoursString || hoursString.toLowerCase().includes('not available')) {
      return {
        schedule: this.getEmptyWeek(),
        hasData: false,
        rawString: hoursString || 'Hours information not available'
      };
    }

    try {
      const schedule = this.getEmptyWeek();
      let notes: string | undefined;

      // Split by semicolons to get individual rules
      const rules = hoursString.split(';').map(rule => rule.trim());

      for (const rule of rules) {
        this.parseRule(rule, schedule);
      }

      // Check for special notes
      if (hoursString.includes('PH')) {
        notes = 'Special hours may apply on public holidays';
      }

      return {
        schedule,
        hasData: true,
        rawString: hoursString,
        notes
      };
    } catch (error) {
      console.warn('Failed to parse opening hours:', hoursString, error);
      return {
        schedule: this.getEmptyWeek(),
        hasData: false,
        rawString: hoursString,
        notes: 'Unable to parse hours format'
      };
    }
  }

  /**
   * Create empty week structure
   */
  private getEmptyWeek(): DayHours[] {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return days.map(day => ({
      day: this.dayMapping[day],
      fullDay: this.fullDayMapping[day],
      hours: 'Hours not available',
      isOpen: false,
      isClosed: false
    }));
  }

  /**
   * Parse a single rule like "Mo-Th 09:00-15:00" or "Sa,Su off"
   */
  private parseRule(rule: string, schedule: DayHours[]): void {
    // Handle "off" or "closed"
    if (rule.toLowerCase().includes('off') || rule.toLowerCase().includes('closed')) {
      const days = this.extractDays(rule);
      if (days) {
        this.applyToSchedule(schedule, days, 'Closed', false, true);
      }
      return;
    }

    // Handle 24/7
    if (rule.includes('24/7')) {
      const days = this.extractDays(rule) || ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
      this.applyToSchedule(schedule, days, '24 hours', true, false);
      return;
    }

    // Extract days and hours
    const days = this.extractDays(rule);
    const hours = this.extractHours(rule);

    if (days && hours) {
      this.applyToSchedule(schedule, days, hours, true, false);
    }
  }

  /**
   * Extract day codes from rule
   */
  private extractDays(rule: string): string[] | null {
    const dayPattern = /([A-Za-z,\-]+)\s/;
    const match = rule.match(dayPattern);
    
    if (!match) return null;

    const dayPart = match[1];
    const days: string[] = [];

    // Handle ranges like "Mo-Fr"
    if (dayPart.includes('-')) {
      const parts = dayPart.split(',');
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-');
          days.push(...this.expandDayRange(start, end));
        } else {
          days.push(part);
        }
      }
    } else {
      // Handle comma-separated days like "Sa,Su"
      days.push(...dayPart.split(','));
    }

    return days.filter(day => this.dayMapping[day]);
  }

  /**
   * Expand day range like "Mo-Fr" to ["Mo", "Tu", "We", "Th", "Fr"]
   */
  private expandDayRange(start: string, end: string): string[] {
    const allDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const startIndex = allDays.indexOf(start);
    const endIndex = allDays.indexOf(end);
    
    if (startIndex === -1 || endIndex === -1) return [];
    
    const result: string[] = [];
    let current = startIndex;
    
    while (current !== endIndex) {
      result.push(allDays[current]);
      current = (current + 1) % 7;
    }
    result.push(allDays[endIndex]);
    
    return result;
  }

  /**
   * Extract and format hours from rule
   */
  private extractHours(rule: string): string | null {
    const timePattern = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/;
    const match = rule.match(timePattern);
    
    if (!match) return null;
    
    const [, start, end] = match;
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  /**
   * Format time from 24h to 12h format
   */
  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours === 0) return `12:${minutes.toString().padStart(2, '0')} AM`;
    if (hours < 12) return `${hours}:${minutes.toString().padStart(2, '0')} AM`;
    if (hours === 12) return `12:${minutes.toString().padStart(2, '0')} PM`;
    
    return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
  }

  /**
   * Apply parsed data to schedule
   */
  private applyToSchedule(
    schedule: DayHours[], 
    days: string[], 
    hours: string, 
    isOpen: boolean, 
    isClosed: boolean
  ): void {
    for (const day of days) {
      const dayIndex = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].indexOf(day);
      if (dayIndex !== -1) {
        schedule[dayIndex] = {
          ...schedule[dayIndex],
          hours,
          isOpen,
          isClosed
        };
      }
    }
  }

  /**
   * Get current day status
   */
  getCurrentDayStatus(parsedHours: ParsedHours): { isOpenNow: boolean; todayHours: string } {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayMapping = [6, 0, 1, 2, 3, 4, 5]; // Convert JS day to our array index
    const todayIndex = dayMapping[today];
    
    const todaySchedule = parsedHours.schedule[todayIndex];
    
    return {
      isOpenNow: todaySchedule.isOpen,
      todayHours: todaySchedule.hours
    };
  }

  /**
   * Compute open/closed state and next change using a timezone-aware clock
   */
  getOpenNowState(parsedHours: ParsedHours, timeZone: string): { isOpenNow: boolean; untilLabel?: string } {
    if (!parsedHours?.hasData) {
      return { isOpenNow: false };
    }

    const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date());
    const hourParts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const hourStr = (hourParts.find(p => p.type === 'hour')?.value || '00');
    const minuteStr = (hourParts.find(p => p.type === 'minute')?.value || '00');
    const nowMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

    const weekdayIndexMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const todayIndex = weekdayIndexMap[weekdayShort as keyof typeof weekdayIndexMap] ?? 0;

    const parseTime12hToMinutes = (label: string): number | null => {
      const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3].toUpperCase();
      if (ampm === 'AM') {
        if (h === 12) h = 0;
      } else {
        if (h !== 12) h += 12;
      }
      return h * 60 + min;
    };

    const parseRange = (hours: string): { start: number; end: number } | null => {
      const parts = hours.split('-').map(s => s.trim());
      if (parts.length !== 2) return null;
      const start = parseTime12hToMinutes(parts[0]);
      const end = parseTime12hToMinutes(parts[1]);
      if (start == null || end == null) return null;
      return { start, end };
    };

    const fmt = (minutes: number): string => {
      const h24 = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      if (h24 === 0) return `12:${m.toString().padStart(2, '0')} AM`;
      if (h24 < 12) return `${h24}:${m.toString().padStart(2, '0')} AM`;
      if (h24 === 12) return `12:${m.toString().padStart(2, '0')} PM`;
      return `${h24 - 12}:${m.toString().padStart(2, '0')} PM`;
    };

    const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getLabelForDay = (idx: number) => dayNamesShort[idx % 7];

    const getDayRange = (idx: number): { type: 'closed'|'all'|'range'; start?: number; end?: number } => {
      const entry = parsedHours.schedule[idx];
      const hours = entry?.hours || '';
      if (!hours || /not available/i.test(hours)) return { type: 'closed' };
      if (/24\s*hours/i.test(hours)) return { type: 'all' };
      if (/closed/i.test(hours)) return { type: 'closed' };
      const r = parseRange(hours);
      if (!r) return { type: 'closed' };
      return { type: 'range', start: r.start, end: r.end };
    };

    // Today
    const today = getDayRange(todayIndex);

    const computeOpenNow = (range: { start: number; end: number } | null): { open: boolean; until?: string } => {
      if (!range) return { open: false };
      const { start, end } = range;
      if (end > start) {
        if (nowMinutes >= start && nowMinutes < end) {
          return { open: true, until: fmt(end) };
        }
        return { open: false };
      }
      // wraps past midnight
      if (nowMinutes >= start || nowMinutes < end) {
        return { open: true, until: fmt(end) };
      }
      return { open: false };
    };

    if (today.type === 'all') {
      return { isOpenNow: true };
    }

    if (today.type === 'range') {
      const state = computeOpenNow({ start: today.start!, end: today.end! });
      if (state.open) {
        return { isOpenNow: true, untilLabel: state.until };
      }
      // Closed now but opens later today (non-wrap case)
      if (today.end! > today.start! && nowMinutes < today.start!) {
        return { isOpenNow: false, untilLabel: `${fmt(today.start!)} ${getLabelForDay(todayIndex)}` };
      }
    }

    // Find next opening time
    for (let offset = 1; offset <= 7; offset++) {
      const idx = (todayIndex + offset) % 7;
      const next = getDayRange(idx);
      if (next.type === 'all') {
        return { isOpenNow: false, untilLabel: `${fmt(0)} ${getLabelForDay(idx)}` };
      }
      if (next.type === 'range') {
        return { isOpenNow: false, untilLabel: `${fmt(next.start!)} ${getLabelForDay(idx)}` };
      }
    }

    return { isOpenNow: false };
  }
}

export const openingHoursParser = new OpeningHoursParser(); 