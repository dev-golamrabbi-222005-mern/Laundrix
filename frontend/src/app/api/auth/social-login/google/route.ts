import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Google credential is required" },
        { status: 400 }
      );
    }

    // Verify token using Google tokeninfo endpoint
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!googleRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid Google credential" },
        { status: 400 }
      );
    }

    const payload = await googleRes.json();
    const { email, name, picture } = payload;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Google account does not provide an email" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          fullName: name || "Google User",
          userType: "CUSTOMER",
          status: "ACTIVE",
          isVerified: true,
          profileImage: picture || null,
          lastLogin: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          isVerified: true,
          ...(picture && !user.profileImage ? { profileImage: picture } : {}),
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
      message: "Successfully logged in with Google",
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
      { success: false, error: error.message || "Failed to login with Google" },
      { status: 500 }
    );
  }
}
