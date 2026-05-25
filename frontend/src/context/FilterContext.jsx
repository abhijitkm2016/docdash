import { createContext, useContext, useState } from 'react';

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  // { [dimensionId]: selectedValue }
  const [activeFilters, setActiveFilters] = useState({});

  function setFilter(dimensionId, value) {
    setActiveFilters(prev => {
      // Toggle off if same value clicked again
      if (prev[dimensionId] === value) {
        const next = { ...prev };
        delete next[dimensionId];
        return next;
      }
      return { ...prev, [dimensionId]: value };
    });
  }

  function clearFilter(dimensionId) {
    setActiveFilters(prev => {
      const next = { ...prev };
      delete next[dimensionId];
      return next;
    });
  }

  function clearAllFilters() {
    setActiveFilters({});
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <FilterContext.Provider value={{ activeFilters, setFilter, clearFilter, clearAllFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
