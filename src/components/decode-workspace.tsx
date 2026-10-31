import { Children, type ReactNode, useSyncExternalStore } from "react";

const query = window.matchMedia("(max-width: 800px)");
function subscribe(change: () => void) {
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}
function snapshot() {
  return query.matches;
}
/** Keyed siblings move together with their state; keyboard order follows the layout. */
export function DecodeWorkspace({ children }: { children: ReactNode }) {
  const mobile = useSyncExternalStore(subscribe, snapshot);
  const [settings, source, result] = Children.toArray(children);
  return (
    <div className="workspace decode-workspace">
      {mobile ? [source, result, settings] : [settings, source, result]}
    </div>
  );
}
