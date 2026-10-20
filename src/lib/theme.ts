const THEME_KEY = 'theme'

export type Theme = 'light' | 'dark'

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage can be blocked. The choice still applies for this visit.
  }
}
