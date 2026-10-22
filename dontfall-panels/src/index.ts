import { ExtensionContext } from "@foxglove/extension";

import { initStatusPanel } from "./StatusPanel";
import { initTiltPanel } from "./TiltPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "DontFall status", initPanel: initStatusPanel });
  extensionContext.registerPanel({ name: "DontFall tilt", initPanel: initTiltPanel });
}
