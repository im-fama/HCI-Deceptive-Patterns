import { forwardRef, type PointerEvent, type ReactNode } from "react";
import type { Condition } from "../types";
import { StatusBar } from "./StatusBar";

type Props = {
  mode: Condition;
  /** Current app screen; lets the status bar area match the screen background. */
  screen?: string;
  children: ReactNode;
  onPointerDownCapture?: (e: PointerEvent<HTMLDivElement>) => void;
};

/** Phone frame on desktop; full screen (fixed, safe-area aware) at ≤ 520px wide. */
export const DeviceFrame = forwardRef<HTMLDivElement, Props>(function DeviceFrame(
  { mode, screen, children, onPointerDownCapture },
  ref,
) {
  return (
    <div className="sn-stage">
      <div ref={ref} className={`sn-device sn-app ${mode} ${screen ? `scr-${screen}` : ""}`} data-mode={mode} onPointerDownCapture={onPointerDownCapture}>
        <StatusBar mode={mode} />
        <div className="sn-viewport">{children}</div>
        <div className="sn-home-ind" aria-hidden="true" />
      </div>
    </div>
  );
});
