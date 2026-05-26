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
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host") {
      headers.set("host", "server.konsoftech.in");
    } else if (lowerKey === "user-agent") {
      // Force desktop user-agent to ensure backend doesn't serve mobile templates
      headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    } else {
      headers.set(key, value);
    }
  });

  if (headers.has("origin")) {
    headers.set("origin", "https://server.konsoftech.in");
  }
  if (headers.has("referer")) {
    const originalReferer = headers.get("referer") || "";
    try {
      const refUrl = new URL(originalReferer);
      headers.set("referer", `https://server.konsoftech.in${refUrl.pathname}${refUrl.search}`);
    } catch {
      headers.set("referer", `https://server.konsoftech.in/ics/${path}`);
    }
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

    // Delete content-encoding and content-length for ALL responses.
    // Node.js fetch automatically decompresses gzip/br bodies, but doesn't always remove the header.
    // If we forward 'content-encoding: gzip' but the body is decompressed, the browser will fail to load CSS/JS.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    const contentType = responseHeaders.get("content-type") || "";
    if (contentType.toLowerCase().includes("text/html")) {
      let html = await response.text();
      
      const dirPath = path ? path.split('/').slice(0, -1).join('/') : "";
      const baseHref = dirPath ? `/ics/${dirPath}/` : `/ics/`;

      if (html.toLowerCase().includes("<head>")) {
        html = html.replace(/<head>/i, `<head><base href="${baseHref}">`);
      } else if (html.toLowerCase().includes("<html")) {
        html = html.replace(/<html[^>]*>/i, `$&<head><base href="${baseHref}"></head>`);
      } else {
        html = `<head><base href="${baseHref}"></head>` + html;
      }

      // Rewrite absolute backend URLs to relative /ics/ paths in the HTML
      html = html.replace(/(href|src|action)=["']https?:\/\/server\.konsoftech\.in\/ics\//gi, '$1="/ics/');
      
      // Rewrite root-relative paths to be /ics/ relative
      // e.g., href="/css/style.css" -> href="/ics/css/style.css"
      // Negative lookahead ensures we don't rewrite href="//" or href="/ics/"
      html = html.replace(/(href|src|action)=["']\/(?!\/|ics\/)/gi, '$1="/ics/');
      html = html.replace(/url\(["']?\/(?!\/|ics\/)/gi, 'url("/ics/');

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

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
