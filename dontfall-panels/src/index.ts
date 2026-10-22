import { ExtensionContext } from "@foxglove/extension";

import { initStatusPanel } from "./StatusPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "DontFall status", initPanel: initStatusPanel });
}
