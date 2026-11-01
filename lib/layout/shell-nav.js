export const SHELL_NAV_LEFT_KEY = "ptp-shell-left-nav";
export const SHELL_NAV_RIGHT_KEY = "ptp-shell-right-nav";

export const SHELL_NAV_LEFT_WIDTH_EXPANDED = "14rem";
export const SHELL_NAV_LEFT_WIDTH_COLLAPSED = "3.5rem";
export const SHELL_NAV_RIGHT_WIDTH_EXPANDED = "11rem";
export const SHELL_NAV_RIGHT_WIDTH_COLLAPSED = "3.5rem";

export const SHELL_FIXED_CHROME_CLASS =
  "md:left-[var(--shell-nav-left)] md:right-[var(--shell-nav-right)]";

export const SHELL_FLOATING_RIGHT_CLASS =
  "md:right-[calc(var(--shell-nav-right)+0.75rem)]";

function readExpanded(key) {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(key) !== "0";
}

export function getShellNavLeftExpanded() {
  return readExpanded(SHELL_NAV_LEFT_KEY);
}

export function getShellNavRightExpanded() {
  return readExpanded(SHELL_NAV_RIGHT_KEY);
}

export function setShellNavLeftExpanded(expanded) {
  localStorage.setItem(SHELL_NAV_LEFT_KEY, expanded ? "1" : "0");
  window.dispatchEvent(new Event("ptp-shell-nav"));
}

export function setShellNavRightExpanded(expanded) {
  localStorage.setItem(SHELL_NAV_RIGHT_KEY, expanded ? "1" : "0");
  window.dispatchEvent(new Event("ptp-shell-nav"));
}

export function subscribeShellNav(callback) {
  window.addEventListener("ptp-shell-nav", callback);
  return () => window.removeEventListener("ptp-shell-nav", callback);
}

export function applyShellNavCssVars(leftExpanded, rightExpanded) {
  const root = document.documentElement;
  const desktop =
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

  if (!desktop) {
    root.style.setProperty("--shell-nav-left", "0px");
    root.style.setProperty("--shell-nav-right", "0px");
    return;
  }

  root.style.setProperty(
    "--shell-nav-left",
    leftExpanded ? SHELL_NAV_LEFT_WIDTH_EXPANDED : SHELL_NAV_LEFT_WIDTH_COLLAPSED,
  );
  root.style.setProperty(
    "--shell-nav-right",
    rightExpanded ? SHELL_NAV_RIGHT_WIDTH_EXPANDED : SHELL_NAV_RIGHT_WIDTH_COLLAPSED,
  );
  root.dataset.shellLeftNav = leftExpanded ? "expanded" : "collapsed";
  root.dataset.shellRightNav = rightExpanded ? "expanded" : "collapsed";
}

/** @deprecated use getShellNavLeftExpanded */
export const getShellNavLeftOpen = getShellNavLeftExpanded;
/** @deprecated use getShellNavRightExpanded */
export const getShellNavRightOpen = getShellNavRightExpanded;
