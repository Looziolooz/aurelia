import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  // `render` is excluded: app/render is a locale-less offline hero-render
  // route (Playwright capture target). next-intl's localePrefix:"always"
  // would 307 it to /<locale>/render, which doesn't exist → 404.
  matcher: ["/((?!api|_next|_vercel|render|.*\\..*).*)"],
};
