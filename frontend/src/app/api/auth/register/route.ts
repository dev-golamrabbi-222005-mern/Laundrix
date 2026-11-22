import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, name, email, password, phoneNumber } = body;
    const resolvedName = fullName || name;

    if (!resolvedName) {
      return NextResponse.json({ success: false, message: "Full name is required" }, { status: 400 });
    }
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required" }, { status: 400 });
    }
    if (!phoneNumber) {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingEmail) {
      return NextResponse.json({ success: false, message: "User already exists with this email" }, { status: 400 });
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: phoneNumber.trim() },
    });
    if (existingPhone) {
      return NextResponse.json({ success: false, message: "This phone number is already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName: resolvedName.trim(),
        email: email.toLowerCase().trim(),
        phone: phoneNumber.trim(),
        password: hashedPassword,
        userType: "CUSTOMER",
        isVerified: false,
        status: "PENDING",
      },
    });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60s validity

    await prisma.userOTP.create({
      data: {
        userId: user.id,
        phone: phoneNumber.trim(),
        otpCode,
        purpose: "REGISTRATION",
        expiresAt,
        status: "PENDING",
      },
    });

    // Try sending SMS via mram gateway if configured
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;
    if (apiKey && senderId) {
      let formattedPhone = phoneNumber.replace(/[^\d]/g, "");
      if (formattedPhone.startsWith("0")) formattedPhone = `88${formattedPhone}`;
      else if (formattedPhone.length === 10) formattedPhone = `880${formattedPhone}`;

      axios.post(
        process.env.SMS_API_URL || "https://sms.mram.com.bd/smsapi",
        {
          api_key: apiKey,
          senderid: senderId,
          type: "text",
          msg: `Your LAUNDRIX registration code is: ${otpCode}. Valid for 1 minute.`,
          contacts: formattedPhone,
        },
        { timeout: 5000 }
      ).catch((err) => console.error("SMS sending error:", err.message));
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your phone number",
      data: userWithoutPassword,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
