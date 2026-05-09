import { Link } from "react-router-dom";
import { Button } from "@/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="text-center">
        <p className="font-mono text-text-subtle text-xs uppercase tracking-widest">404</p>
        <h1 className="mt-2 text-text-primary text-3xl font-semibold">Lost in the canvas</h1>
        <p className="mt-2 text-text-muted text-sm">
          The route you tried to open doesn't exist.
        </p>
        <Link to="/projects" className="mt-5 inline-block">
          <Button variant="primary">Back to projects</Button>
        </Link>
      </div>
    </div>
  );
}
