import { NextRequest, NextResponse } from "next/server";

function buildVerifyUrl(request: NextRequest, token: string) {
  const remoteBase =
    process.env.REMOTE_API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!remoteBase) {
    throw new Error("REMOTE_API_URL not configured on server");
  }

  const cleanBase = remoteBase.replace(/\/+$/, "");
  const url = new URL(`${cleanBase}/auth/verify`);
  url.searchParams.set("token", token);
  return url;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { message: "Verification token is missing." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(buildVerifyUrl(request, token), {
      method: "GET",
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({
        message: "Email đã được xác thực thành công.",
      });
    }

    let data: { message?: string | string[] } = {};
    try {
      data = (await response.json()) as { message?: string | string[] };
    } catch {
      data = {};
    }

    const message = Array.isArray(data.message)
      ? data.message.join(" ")
      : data.message || "Không thể xác thực email này.";

    return NextResponse.json({ message }, { status: response.status || 400 });
  } catch {
    return NextResponse.json(
      { message: "Không thể kết nối đến dịch vụ xác thực ngay bây giờ." },
      { status: 503 },
    );
  }
}
