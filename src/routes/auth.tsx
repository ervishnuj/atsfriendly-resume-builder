import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy sign-in path — the product now uses /login and /register.
export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
