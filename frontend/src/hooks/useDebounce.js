import { useEffect, useState } from 'react';

// Returns a debounced copy of `value` that only updates after `delay` ms
// have passed without `value` changing. Used on search inputs so filtering
// (client-side or via API) doesn't run on every single keystroke.
export default function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
