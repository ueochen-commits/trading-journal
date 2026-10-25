import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains('dark');

/** Keeps embedded charts in sync when the app changes its root theme class. */
export const useIsDarkMode = () => useSyncExternalStore(subscribe, getSnapshot, () => false);
