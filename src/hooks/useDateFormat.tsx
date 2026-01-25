import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { formatDate } from '@/lib/dateFormat';

/**
 * Hook to format dates using the company's configured date format
 * @returns formatDate function that uses company settings
 */
export function useDateFormat() {
  const { company } = useAuth();
  
  const dateFormat = company?.date_format || 'dd/MM/yyyy';
  
  const format = useCallback(
    (date: Date | string | null | undefined): string => {
      return formatDate(date, dateFormat);
    },
    [dateFormat]
  );

  return {
    formatDate: format,
    dateFormat,
  };
}
