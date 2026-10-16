"use client";

import ThemePreference from './ThemePreference';

// The application header offers a theme switch only.
// Curriculum navigation lives entirely in the domain-select sidebar.
export function AppHeaderActions() {
  return <div className="header-actions"><ThemePreference /></div>;
}
