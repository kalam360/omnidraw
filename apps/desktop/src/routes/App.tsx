import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdaptersProvider } from "@/lib/adapters/adapters-context";
import { AppShell } from "@/shell/AppShell";
import Welcome from "./Welcome";
import Connect from "./Connect";
import Connecting from "./Connecting";
import CreateProject from "./CreateProject";
import ProjectListRoute from "./ProjectList";
import ProjectView from "./ProjectView";
import Session from "./Session";
import Settings from "./Settings";
import NotFound from "./NotFound";
import PresentationMode from "@/presentation/PresentationMode";

export default function App() {
  return (
    <AdaptersProvider>
      <BrowserRouter>
        <Routes>
          {/* Onboarding routes — full-screen, no shell */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/connecting" element={<Connecting />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:projectId/present" element={<PresentationMode />} />

          {/* App routes — wrapped in shell */}
          <Route element={<AppShell />}>
            <Route path="/projects" element={<ProjectListRoute />} />
            <Route path="/projects/:projectId" element={<ProjectView />} />
            <Route path="/projects/:projectId/threads/:threadId" element={<Session />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AdaptersProvider>
  );
}
