export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*"],
};

// Note: Next.js 16+ recommends "proxy" convention.
// This middleware still works but may show a deprecation warning.
