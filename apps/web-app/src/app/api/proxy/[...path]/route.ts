import { NextRequest, NextResponse } from "next/server";

function buildTargetUrl(request: NextRequest, pathSegments: string[]) {
  const remoteBase =
    process.env.REMOTE_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!remoteBase) {
    throw new Error("REMOTE_API_URL not configured on server");
  }

  const cleanBase = remoteBase.replace(/\/+$/, "");
  const cleanPath = pathSegments.filter(Boolean).join("/");
  const url = new URL(`${cleanBase}/${cleanPath}`);
  url.search = request.nextUrl.search;
  return url;
}

async function forward(request: NextRequest, pathSegments: string[]) {
  const targetUrl = buildTargetUrl(request, pathSegments);
  console.log("[proxy] forwarding", request.method, targetUrl.toString());

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await fetch(targetUrl, init);
  console.log("[proxy] response", response.status, targetUrl.toString());

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");
  responseHeaders.delete("keep-alive");
  responseHeaders.delete("proxy-authenticate");
  responseHeaders.delete("proxy-authorization");
  responseHeaders.delete("te");
  responseHeaders.delete("trailers");
  responseHeaders.delete("upgrade");
  // Node fetch decompresses the body automatically. If we forward content-encoding, the browser will fail to decode.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}
