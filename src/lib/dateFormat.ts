import { format, parseISO } from 'date-fns';

// Available date format options
export const DATE_FORMAT_OPTIONS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (31/01/2026)' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (01/31/2026)' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2026-01-31)' },
  { value: 'dd-MM-yyyy', label: 'DD-MM-YYYY (31-01-2026)' },
  { value: 'dd MMM yyyy', label: 'DD MMM YYYY (31 Jan 2026)' },
  { value: 'MMM dd, yyyy', label: 'MMM DD, YYYY (Jan 31, 2026)' },
  { value: 'dd MMMM yyyy', label: 'DD MMMM YYYY (31 January 2026)' },
] as const;

export type DateFormatValue = typeof DATE_FORMAT_OPTIONS[number]['value'];

/**
 * Formats a date using the specified format pattern
 * @param date - Date object, ISO string, or date string
 * @param dateFormat - Format pattern (e.g., 'dd/MM/yyyy')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  dateFormat: string = 'dd/MM/yyyy'
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, dateFormat);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}
