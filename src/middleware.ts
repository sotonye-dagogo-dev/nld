import { NextResponse, type NextRequest } from "next/server";

// Cheap admin-route redirect: if the session cookie is absent, bounce to the
// login page. Real authorization (token validation + admins row) happens in
// the guarded (panel) layout and API guards — this is just UX, not a security
// boundary.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin pages (login, invite signup) and the auth API are excluded.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/invite/") ||
    pathname.startsWith("/api/admin/")
  ) {
    return NextResponse.next();
  }

  if (!request.cookies.has("admin_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};