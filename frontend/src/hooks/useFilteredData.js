import { useMemo } from 'react';
import { useFilter } from '../context/FilterContext';

/**
 * Filter table rows by all active dimension filters.
 * Matches column names against dimension label or id (case-insensitive).
 */
export function useFilteredRows(columns, rows, dimensions = []) {
  const { activeFilters } = useFilter();

  return useMemo(() => {
    if (!rows) return [];
    const entries = Object.entries(activeFilters);
    if (entries.length === 0) return rows;

    return rows.filter(row =>
      entries.every(([dimensionId, value]) => {
        const dim = dimensions.find(d => d.id === dimensionId);
        if (!dim) return true;

        const colIdx = columns.findIndex(col =>
          col.toLowerCase() === dim.label.toLowerCase() ||
          col.toLowerCase() === dimensionId.toLowerCase().replace(/_/g, ' ')
        );
        if (colIdx === -1) return true;
        return String(row[colIdx]).toLowerCase() === String(value).toLowerCase();
      })
    );
  }, [activeFilters, columns, rows, dimensions]);
}

/**
 * For a chart with a dimensionId, dim non-matching data points when that
 * dimension has an active filter. Charts without a dimensionId are unaffected.
 */
export function useFilteredChartData(chart) {
  const { activeFilters } = useFilter();

  return useMemo(() => {
    if (!chart.dimensionId || !activeFilters[chart.dimensionId]) {
      return chart.data;
    }
    const activeValue = activeFilters[chart.dimensionId];
    return chart.data.map(d =>
      String(d[chart.dataKey]) === String(activeValue)
        ? d
        : { ...d, [chart.valueKey]: 0 }
    );
  }, [activeFilters, chart]);
}
