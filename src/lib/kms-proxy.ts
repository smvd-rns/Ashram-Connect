import { NextRequest, NextResponse } from "next/server";

/**
 * Shared reverse proxy handler for the /kms route tree.
 * Imported by both src/app/kms/route.ts and src/app/kms/[...path]/route.ts.
 */
export async function kmsProxyHandler(req: NextRequest, pathSegments: string[]) {
  // Filter out empty segments (the root /kms route passes [""])
  const path = pathSegments.filter(Boolean).join("/");
  const searchParams = req.nextUrl.search;
  const targetUrl = `https://kms.iskconpune.com/${path}${searchParams}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "host") {
      headers.set("host", "kms.iskconpune.com");
    } else if (lowerKey === "user-agent") {
      // Force desktop user-agent to ensure backend doesn't serve mobile templates
      headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    } else {
      headers.set(key, value);
    }
  });

  if (headers.has("origin")) {
    headers.set("origin", "https://kms.iskconpune.com");
  }
  if (headers.has("referer")) {
    const originalReferer = headers.get("referer") || "";
    try {
      const refUrl = new URL(originalReferer);
      headers.set("referer", `https://kms.iskconpune.com${refUrl.pathname}${refUrl.search}`);
    } catch {
      headers.set("referer", `https://kms.iskconpune.com/${path}`);
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
            .replace(/;\s*path=\/kms\//i, "; Path=/kms")
            .trim()
          )
          .forEach(c => responseHeaders.append("set-cookie", c));
      } else if (lowerKey === "location") {
        let redirectUrl = value;

        // Rewrite absolute external URLs to relative /kms paths
        if (redirectUrl.startsWith("https://kms.iskconpune.com/") || redirectUrl.startsWith("http://kms.iskconpune.com/")) {
          redirectUrl = redirectUrl.replace(/^https?:\/\/kms\.iskconpune\.com\//i, "/kms/");
        } else if (redirectUrl === "https://kms.iskconpune.com" || redirectUrl === "http://kms.iskconpune.com") {
          redirectUrl = "/kms";
        }

        // Avoid infinite loop
        if (redirectUrl === "/kms/") {
          redirectUrl = "/kms";
        }

        // Resolve relative redirects
        if (!redirectUrl.startsWith("/") && !redirectUrl.startsWith("http")) {
          const basePath = path ? `/kms/${path.split('/').slice(0, -1).join('/')}` : '/kms';
          redirectUrl = `${basePath.endsWith('/') ? basePath : basePath + '/'}${redirectUrl}`;
        }

        // Prepend /kms to any absolute-path-relative redirect
        if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("/kms")) {
          redirectUrl = `/kms${redirectUrl}`;
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
      const baseHref = dirPath ? `/kms/${dirPath}/` : `/kms/`;

      if (html.toLowerCase().includes("<head>")) {
        html = html.replace(/<head>/i, `<head><base href="${baseHref}">`);
      } else if (html.toLowerCase().includes("<html")) {
        html = html.replace(/<html[^>]*>/i, `$&<head><base href="${baseHref}"></head>`);
      } else {
        html = `<head><base href="${baseHref}"></head>` + html;
      }

      // Rewrite absolute backend URLs to relative /kms/ paths in the HTML
      html = html.replace(/(href|src|action)=["']https?:\/\/kms\.iskconpune\.com\//gi, '$1="/kms/');
      
      // Rewrite root-relative paths to be /kms/ relative
      html = html.replace(/(href|src|action)=["']\/(?!\/|kms\/)/gi, '$1="/kms/');
      html = html.replace(/url\(["']?\/(?!\/|kms\/)/gi, 'url("/kms/');

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
    console.error(`[KMS Proxy Error on /kms/${path}]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
