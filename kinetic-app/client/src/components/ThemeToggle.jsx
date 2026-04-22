import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-surface-container-low dark:bg-gray-800 transition-all duration-300 hover:scale-110 flex items-center justify-center"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? (
        <span className="material-symbols-outlined text-electric-lime">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-on-surface dark:text-white">dark_mode</span>
      )}
    </button>
  );
};

export default ThemeToggle;
