const VIEW_KEY = "view";

export type LibraryView = "cards" | "list";

export function currentView(): LibraryView {
  return document.documentElement.dataset.view === "list" ? "list" : "cards";
}

export function applyView(view: LibraryView) {
  if (view === "list") document.documentElement.dataset.view = "list";
  else delete document.documentElement.dataset.view;
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage can be blocked. The choice still applies for this visit.
  }
}
