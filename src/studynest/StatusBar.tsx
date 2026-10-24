import type { Condition } from "../types";
import { StatusIcons } from "./icons";

/** Fake status bar; hidden on real phones by CSS (the real one is already there). */
export function StatusBar({ mode }: { mode: Condition }) {
  return (
    <div className="sn-statusbar" aria-hidden="true">
      <span className="sn-time">{mode === "ios" ? "9:41" : "12:00"}</span>
      <StatusIcons mode={mode} />
    </div>
  );
}
