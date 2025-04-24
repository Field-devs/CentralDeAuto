import { useState, useCallback } from 'react';

type PeriodType = '1month' | '15days' | '1day' | 'custom' | 'all';

interface DateRange {
  startDate: string;
  endDate: string;
}

export const useDateRange = (initialPeriod: PeriodType = '1month') => {
  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriod);
  
  const calculateDateRange = useCallback((type: PeriodType): DateRange => {
    const end = new Date();
    const start = new Date();
    
    // For 'all' type, set dates to a very wide range to include all records
    if (type === 'all') {
      start.setFullYear(start.getFullYear() - 10); // 10 years ago
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }

    switch (type) {
      case '1month':
        start.setMonth(end.getMonth() - 1);
        break;
      case '15days':
        start.setDate(end.getDate() - 15);
        break;
      case '1day':
        // For 1 day, set both start and end to today
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        // For custom, keep current dates
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        };
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, []);

  const [dateRange, setDateRange] = useState<DateRange>(() => calculateDateRange(initialPeriod));

  const updatePeriod = useCallback((type: PeriodType) => {
    setPeriodType(type);
    if (type !== 'custom') {
      setDateRange(calculateDateRange(type));
    }
  }, [calculateDateRange]);

  return {
    periodType,
    dateRange,
    updatePeriod,
    setDateRange
  };
};