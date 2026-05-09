import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

/**
 * Two-column app layout: persistent <Sidebar/> on the left, the active
 * route on the right (which decides whether it shows chat + canvas).
 */
export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-page text-text-body">
      <Sidebar />
      <main className="flex h-full min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
