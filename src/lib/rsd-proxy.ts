import { NextRequest, NextResponse } from "next/server";

/**
 * Shared reverse proxy handler for the /rsd route tree.
 * Imported by both src/app/rsd/route.ts and src/app/rsd/[...path]/route.ts.
 */
export async function rsdProxyHandler(req: NextRequest, pathSegments: string[]) {
  // Filter out empty segments (the root /rsd route passes [""])
  const path = pathSegments.filter(Boolean).join("/");
  const searchParams = req.nextUrl.search;
  const targetUrl = `https://radheshyamdas.com/${path}${searchParams}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host") {
      headers.set("host", "radheshyamdas.com");
    } else if (lowerKey === "user-agent") {
      // Force desktop user-agent to ensure backend doesn't serve mobile templates
      headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    } else {
      headers.set(key, value);
    }
  });

  if (headers.has("origin")) {
    headers.set("origin", "https://radheshyamdas.com");
  }
  if (headers.has("referer")) {
    const originalReferer = headers.get("referer") || "";
    try {
      const refUrl = new URL(originalReferer);
      headers.set("referer", `https://radheshyamdas.com${refUrl.pathname}${refUrl.search}`);
    } catch {
      headers.set("referer", `https://radheshyamdas.com/${path}`);
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
      
      // Skip hop-by-hop headers to prevent proxy protocol issues
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
        // Strip Secure + SameSite so cookies work on localhost/http
        const rawCookies = response.headers.getSetCookie();
        rawCookies
          .map(c => c
            .replace(/;\s*secure/i, "")
            .replace(/;\s*samesite=\w+/i, "")
            .replace(/;\s*path=\/rsd\//i, "; Path=/rsd")
            .trim()
          )
          .forEach(c => responseHeaders.append("set-cookie", c));
      } else if (lowerKey === "location") {
        let redirectUrl = value;

        // Rewrite absolute external URLs to relative /rsd paths
        if (redirectUrl.startsWith("https://radheshyamdas.com/") || redirectUrl.startsWith("http://radheshyamdas.com/")) {
          redirectUrl = redirectUrl.replace(/^https?:\/\/radheshyamdas\.com\//i, "/rsd/");
        } else if (redirectUrl === "https://radheshyamdas.com" || redirectUrl === "http://radheshyamdas.com") {
          redirectUrl = "/rsd";
        }

        // Avoid infinite loop
        if (redirectUrl === "/rsd/") {
          redirectUrl = "/rsd";
        }

        // Resolve relative redirects
        if (!redirectUrl.startsWith("/") && !redirectUrl.startsWith("http")) {
          const basePath = path ? `/rsd/${path.split('/').slice(0, -1).join('/')}` : '/rsd';
          redirectUrl = `${basePath.endsWith('/') ? basePath : basePath + '/'}${redirectUrl}`;
        }

        // Prepend /rsd to any absolute-path-relative redirect
        if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("/rsd")) {
          redirectUrl = `/rsd${redirectUrl}`;
        }

        responseHeaders.set("location", redirectUrl);
      } else {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    const contentType = responseHeaders.get("content-type") || "";
    if (contentType.toLowerCase().includes("text/html")) {
      let html = await response.text();
      
      const dirPath = path ? path.split('/').slice(0, -1).join('/') : "";
      const baseHref = dirPath ? `/rsd/${dirPath}/` : `/rsd/`;

      if (html.toLowerCase().includes("<head>")) {
        html = html.replace(/<head>/i, `<head><base href="${baseHref}">`);
      } else if (html.toLowerCase().includes("<html")) {
        html = html.replace(/<html[^>]*>/i, `$&<head><base href="${baseHref}"></head>`);
      } else {
        html = `<head><base href="${baseHref}"></head>` + html;
      }

      // Rewrite absolute backend URLs to relative /rsd/ paths in the HTML
      html = html.replace(/(href|src|action)=["']https?:\/\/radheshyamdas\.com\//gi, '$1="/rsd/');
      
      // Rewrite root-relative paths to be /rsd/ relative
      html = html.replace(/(href|src|action)=["']\/(?!\/|rsd\/)/gi, '$1="/rsd/');
      html = html.replace(/url\(["']?\/(?!\/|rsd\/)/gi, 'url("/rsd/');

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
    console.error(`[RSD Proxy Error on /rsd/${path}]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
