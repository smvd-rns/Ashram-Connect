import { NextRequest, NextResponse } from "next/server";

/**
 * Shared reverse proxy handler for the /ics route tree.
 * Imported by both src/app/ics/route.ts and src/app/ics/[...path]/route.ts.
 * Kept in /lib (not in the route file) to avoid Next.js complaining about
 * non-HTTP-method named exports inside app route files.
 */
export async function icsProxyHandler(req: NextRequest, pathSegments: string[]) {
  // Filter out empty segments (the root /ics route passes [""])
  const path = pathSegments.filter(Boolean).join("/");
  const searchParams = req.nextUrl.search;
  const targetUrl = `https://server.konsoftech.in/ics/${path}${searchParams}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") {
      headers.set("host", "server.konsoftech.in");
    } else {
      headers.set(key, value);
    }
  });

  if (headers.has("origin")) {
    headers.set("origin", "https://server.konsoftech.in");
  }
  if (headers.has("referer")) {
    headers.set("referer", `https://server.konsoftech.in/ics/${path}`);
  }

  const method = req.method;
  let body: any = null;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await req.arrayBuffer();
    } catch {
      body = null;
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual", // Handle redirects ourselves to rewrite Location headers
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      
      // Skip hop-by-hop headers to prevent proxy protocol issues (e.g., ERR_INVALID_CHUNKED_ENCODING)
      if (
        lowerKey === "connection" ||
        lowerKey === "keep-alive" ||
        lowerKey === "proxy-authenticate" ||
        lowerKey === "proxy-authorization" ||
        lowerKey === "te" ||
        lowerKey === "trailer" ||
        lowerKey === "transfer-encoding" ||
        lowerKey === "upgrade"
      ) {
        return;
      }

      if (lowerKey === "set-cookie") {
        // Strip Secure + SameSite so cookies work on http://localhost
        const rawCookies = response.headers.getSetCookie();
        rawCookies
          .map(c => c
            .replace(/;\s*secure/i, "")
            .replace(/;\s*samesite=\w+/i, "")
            .replace(/;\s*path=\/ics\//i, "; Path=/ics")
            .trim()
          )
          .forEach(c => responseHeaders.append("set-cookie", c));
      } else if (lowerKey === "location") {
        let redirectUrl = value;

        // Rewrite absolute external URLs to relative /ics paths
        if (redirectUrl.startsWith("https://server.konsoftech.in/ics/") || redirectUrl.startsWith("http://server.konsoftech.in/ics/")) {
          redirectUrl = redirectUrl.replace(/^https?:\/\/server\.konsoftech\.in\/ics\//i, "/ics/");
        } else if (redirectUrl === "https://server.konsoftech.in/ics" || redirectUrl === "http://server.konsoftech.in/ics") {
          redirectUrl = "/ics";
        }

        // CRITICAL: /ics/ (with trailing slash) triggers a Next.js 308 redirect to /ics,
        // which would then bounce back again — infinite loop. Strip the slash.
        if (redirectUrl === "/ics/") {
          redirectUrl = "/ics";
        }

        // If the redirect URL is purely relative (e.g. "login.jsp"), resolve it to "/ics/..."
        if (!redirectUrl.startsWith("/") && !redirectUrl.startsWith("http")) {
          // If we are at root /ics, path is empty. If we are at /ics/foo, path is foo.
          // Since it's a proxy, we should ideally resolve relative to the current request path.
          // For simplicity, if it's relative, we prepend /ics/ + the directory of the current path.
          const basePath = path ? `/ics/${path.split('/').slice(0, -1).join('/')}` : '/ics';
          redirectUrl = `${basePath.endsWith('/') ? basePath : basePath + '/'}${redirectUrl}`;
        }

        // Prepend /ics to any absolute-path-relative redirect not already under /ics
        if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("/ics")) {
          redirectUrl = `/ics${redirectUrl}`;
        }

        responseHeaders.set("location", redirectUrl);
      } else {
        responseHeaders.set(key, value);
      }
    });

    return new Response(response.body ?? null, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[ICS Proxy Error on /ics/${path}]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
