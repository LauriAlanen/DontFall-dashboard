import { Immutable, MessageEvent, PanelExtensionContext } from "@foxglove/extension";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// The orientation part of sensor_msgs/Imu, from the M4's tilt filter
// (DontFall-M4 app/src/tilt.c). Yaw is not estimated, so it is always 0.
type Quaternion = { x: number; y: number; z: number; w: number };
type Imu = { orientation: Quaternion };

const TOPIC = "/dontfall_m4/imu";
// Copies of SUPERVISOR_ARM_TILT / SUPERVISOR_DISARM_TILT (supervisor.h),
// for drawing only: the M4 makes the decision.
const ARM_DEG = 5;
const DISARM_DEG = 25;
// the gauge's edge
const RANGE_DEG = 30;
const DEG = 180 / Math.PI;

type Tilt = { tilt: number; roll: number; pitch: number; forward: number; left: number };

// Where the body's z axis (up on the robot) points, in the level frame
// (REP 103: x forward, y left, z up). Its angle from vertical is what the
// supervisor checks (tilt_from_upright), whichever way it leans.
function tiltOf(q: Quaternion): Tilt {
  const forward = 2 * (q.x * q.z + q.w * q.y);
  const left = 2 * (q.y * q.z - q.w * q.x);
  const up = 1 - 2 * (q.x * q.x + q.y * q.y);
  return {
    tilt: Math.atan2(Math.hypot(forward, left), up) * DEG,
    roll: Math.atan2(2 * (q.w * q.x + q.y * q.z), up) * DEG,
    pitch: Math.asin(Math.max(-1, Math.min(1, 2 * (q.w * q.y - q.z * q.x)))) * DEG,
    forward,
    left,
  };
}

function TiltPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [tilt, setTilt] = useState<Tilt | undefined>();
  const [dark, setDark] = useState(true);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setDark(renderState.colorScheme !== "light");
      const events = (renderState.currentFrame ?? []) as Immutable<MessageEvent<Imu>[]>;
      const last = events[events.length - 1];
      if (last != undefined) {
        setTilt(tiltOf(last.message.orientation));
      }
    };
    context.watch("currentFrame");
    context.watch("colorScheme");
    context.subscribe([{ topic: TOPIC }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const ink = dark ? "#e0e0e0" : "#212121";
  const r = (deg: number) => (deg / RANGE_DEG) * 100;

  let dot: ReactElement | undefined;
  if (tilt != undefined) {
    // Seen from above, forward up the screen, left to the left. The dot
    // is how far the top leans, clamped to the edge past the range.
    const len = Math.hypot(tilt.forward, tilt.left);
    const dist = Math.min(r(tilt.tilt), 100);
    const sx = len > 0 ? (-tilt.left / len) * dist : 0;
    const sy = len > 0 ? (-tilt.forward / len) * dist : 0;
    const color =
      tilt.tilt <= ARM_DEG ? "#2e7d32" : tilt.tilt <= DISARM_DEG ? "#f9a825" : "#c62828";
    dot = <circle cx={sx} cy={sy} r={8} fill={color} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "0.5rem",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
        color: ink,
      }}
    >
      <svg viewBox="-110 -110 220 220" style={{ flex: 1, minHeight: 0 }}>
        <circle r={100} fill="none" stroke={ink} strokeOpacity={0.3} />
        <circle r={r(DISARM_DEG)} fill="none" stroke="#c62828" strokeDasharray="4 3" />
        <circle r={r(ARM_DEG)} fill="none" stroke="#2e7d32" />
        <line x1={-100} x2={100} stroke={ink} strokeOpacity={0.2} />
        <line y1={-100} y2={100} stroke={ink} strokeOpacity={0.2} />
        <text y={-102} textAnchor="middle" fontSize={9} fill={ink}>
          forward
        </text>
        {dot}
      </svg>
      <div style={{ textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          {tilt == undefined ? "-" : `${tilt.tilt.toFixed(1)}°`}
        </div>
        <div style={{ opacity: 0.7 }}>
          {tilt == undefined
            ? "no IMU data"
            : `roll ${tilt.roll.toFixed(1)}°  pitch ${tilt.pitch.toFixed(1)}°`}
        </div>
        <div style={{ opacity: 0.7 }}>
          arm within {ARM_DEG}°, disarms past {DISARM_DEG}°
        </div>
      </div>
    </div>
  );
}

export function initTiltPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<TiltPanel context={context} />);
  return () => {
    root.unmount();
  };
}
