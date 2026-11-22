import { NextRequest, NextResponse } from "next/server";
import { authenticateServerReq } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await authenticateServerReq(req);
  if (auth.response) return auth.response;

  return NextResponse.json({
    success: true,
    data: auth.user,
  });
}
