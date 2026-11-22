import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Facebook access token is required" },
        { status: 400 }
      );
    }

    // Verify token with Facebook Graph API
    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );

    if (!fbRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid Facebook access token" },
        { status: 400 }
      );
    }

    const data = await fbRes.json();
    const facebookId = data.id;
    const email = data.email || `${facebookId}@facebook.laundrix.com`;
    const name = data.name || "Facebook User";
    const pictureUrl = data.picture?.data?.url || null;

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          fullName: name,
          userType: "CUSTOMER",
          status: "ACTIVE",
          isVerified: true,
          profileImage: pictureUrl,
          lastLogin: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          isVerified: true,
          ...(pictureUrl && !user.profileImage ? { profileImage: pictureUrl } : {}),
        },
      });
    }

    const secret = process.env.JWT_SECRET || "fallback_secret";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.userType },
      secret,
      { expiresIn: expiresIn as any }
    );

    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged in with Facebook",
      data: {
        token,
        user: userWithoutPassword,
      },
    });

    response.cookies.set("laundrix_token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to login with Facebook" },
      { status: 500 }
    );
  }
}
