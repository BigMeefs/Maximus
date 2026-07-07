import { NextResponse, type NextRequest } from "next/server";
import { ADVISOR_COOKIE, isAdvisorName } from "@/lib/constants";

export function proxy(request: NextRequest) {
  const hasAdvisor = isAdvisorName(
    request.cookies.get(ADVISOR_COOKIE)?.value,
  );
  const isSelectRoute = request.nextUrl.pathname.startsWith("/select-advisor");

  if (!hasAdvisor && !isSelectRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/select-advisor";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (hasAdvisor && isSelectRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
