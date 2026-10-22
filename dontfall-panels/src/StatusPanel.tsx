import { Immutable, MessageEvent, PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// What the M4 publishes on /diagnostics (DontFall-M4 app/src/diag.c), the
// fields of diagnostic_msgs/DiagnosticArray this panel reads.
type DiagnosticStatus = { level: number; name: string; message: string };
type DiagnosticArray = { status: DiagnosticStatus[] };

const TOPIC = "/diagnostics";
const SUPERVISOR = "dontfall_m4: supervisor";
const IMU = "dontfall_m4: imu";
// /diagnostics comes at 1 Hz: three missed messages means the link is gone
const STALE_MS = 3000;

type Latest = { supervisor?: DiagnosticStatus; imu?: DiagnosticStatus; receivedMs: number };

function badge(latest: Latest | undefined, now: number): { text: string; color: string } {
  const sup = latest?.supervisor;
  if (latest == undefined || sup == undefined || now - latest.receivedMs > STALE_MS) {
    return { text: "NO DATA", color: "#757575" };
  }
  if (sup.message === "armed") {
    return { text: "ARMED", color: "#2e7d32" };
  }
  // level OK: disarmed at boot or on request; WARN: the supervisor tripped
  return { text: "DISARMED", color: sup.level === 0 ? "#455a64" : "#e65100" };
}

function StatusPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [latest, setLatest] = useState<Latest | undefined>();
  const [now, setNow] = useState(Date.now());
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      const events = (renderState.currentFrame ?? []) as Immutable<MessageEvent<DiagnosticArray>[]>;
      const last = events[events.length - 1];
      if (last != undefined) {
        // Find by name, not position: robust to diag.c adding statuses.
        // Stamped with the PC clock on arrival, so it compares with Date.now().
        const status = last.message.status;
        setLatest({
          supervisor: status.find((s) => s.name === SUPERVISOR),
          imu: status.find((s) => s.name === IMU),
          receivedMs: Date.now(),
        });
      }
    };
    context.watch("currentFrame");
    context.subscribe([{ topic: TOPIC }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // Foxglove only renders when messages arrive; tick to notice them stopping
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      clearInterval(id);
    };
  }, []);

  const b = badge(latest, now);
  const age =
    latest == undefined ? "never" : `${((now - latest.receivedMs) / 1000).toFixed(1)} s ago`;

  return (
    <div
      style={{
        padding: "0.5rem",
        fontFamily: "sans-serif",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: b.color,
          color: "white",
          fontSize: "2rem",
          fontWeight: "bold",
          textAlign: "center",
          padding: "0.75rem",
          borderRadius: "0.5rem",
        }}
      >
        {b.text}
      </div>
      <div style={{ marginTop: "0.5rem", lineHeight: 1.6 }}>
        <div>Supervisor: {latest?.supervisor?.message ?? "-"}</div>
        <div>IMU: {latest?.imu?.message ?? "-"}</div>
        <div style={{ opacity: 0.7 }}>
          {TOPIC}: {age}
        </div>
      </div>
    </div>
  );
}

export function initStatusPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<StatusPanel context={context} />);
  return () => {
    root.unmount();
  };
}
