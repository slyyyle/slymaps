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
}

export const openingHoursParser = new OpeningHoursParser(); 