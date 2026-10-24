// Decorative SVG marks. Kept out of the text flow so innerText is identical in both modes.
type P = { size?: number; color?: string };

export function Check({ size = 16, color = "currentColor" }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Lock({ size = 12 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" />
      <path d="M4 5.5V4a2 2 0 014 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

const TAB_PATHS = [
  // Today, Decks, Stats, Profile
  "M5 4h14v16H5zM5 9h14",
  "M4 7h12v13H4zM8 4h12v13",
  "M5 20V11M12 20V5M19 20v-6",
  "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4.5-6 8-6s7 2 8 6",
];

export function TabIcon({ i, size = 22 }: { i: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={TAB_PATHS[i]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StatusIcons({ mode }: { mode: "ios" | "md" }) {
  if (mode === "ios") {
    return (
      <svg width="68" height="12" viewBox="0 0 68 12" aria-hidden="true">
        <g fill="#000">
          <rect x="0" y="8" width="3" height="4" rx="0.7" />
          <rect x="4.5" y="6" width="3" height="6" rx="0.7" />
          <rect x="9" y="3.5" width="3" height="8.5" rx="0.7" />
          <rect x="13.5" y="1" width="3" height="11" rx="0.7" />
          <path d="M28 3.2a9 9 0 0111.6 0l-1.3 1.4a7 7 0 00-9 0zM30.4 5.9a5.5 5.5 0 016.8 0l-1.3 1.4a3.5 3.5 0 00-4.2 0zM33.8 9.8l-1.5-1.5a2 2 0 013 0z" />
          <rect x="44" y="1" width="21" height="10" rx="3" fill="none" stroke="#000" strokeOpacity=".4" />
          <rect x="46" y="3" width="17" height="6" rx="1.5" />
          <rect x="66" y="4" width="1.5" height="4" rx="0.7" fillOpacity=".4" />
        </g>
      </svg>
    );
  }
  return (
    <svg width="52" height="12" viewBox="0 0 52 12" aria-hidden="true">
      <g fill="#1D1B20">
        <path d="M0 3.5a11 11 0 0114 0L7 11.5z" />
        <path d="M18 11.5L29 0.5v11z" />
        <rect x="38" y="0.5" width="6.5" height="11" rx="1" />
      </g>
    </svg>
  );
}
