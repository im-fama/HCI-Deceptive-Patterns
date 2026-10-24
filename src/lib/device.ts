/** Phone heuristic from §9: coarse pointer and a small screen. */
export function isMobile(): boolean {
  try {
    return window.matchMedia("(pointer:coarse)").matches && Math.min(screen.width, screen.height) < 600;
  } catch {
    return false;
  }
}

export function deviceInfo() {
  return {
    mobile: isMobile(),
    ua: navigator.userAgent.slice(0, 160),
    screen: [screen.width, screen.height] as [number, number],
  };
}
