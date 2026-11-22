import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
  response.cookies.set("laundrix_token", "", { path: "/", maxAge: 0 });
  return response;
}
