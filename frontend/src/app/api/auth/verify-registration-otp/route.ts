import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, message: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone: phone.trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "No pending registration found for this phone number" },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, message: "This account is already verified. Please sign in." },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.userOTP.findFirst({
      where: {
        userId: user.id,
        purpose: "REGISTRATION",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.userOTP.update({
        where: { id: otpRecord.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { success: false, message: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (otpRecord.otpCode !== otp.trim()) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    await prisma.userOTP.update({
      where: { id: otpRecord.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, status: "ACTIVE" },
    });

    const { password: _, ...safeUser } = verifiedUser;

    return NextResponse.json({
      success: true,
      message: "Phone verified successfully! Your account is now active.",
      data: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
