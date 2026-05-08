import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { AppError } from "@/utils/errors";
import { createErrorResponse, parseJsonBody, requireTrimmedString } from "@/utils/http";

type SignupRequestBody = {
  name?: string;
  email?: string;
  password?: string;
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<SignupRequestBody>(request);
    const email = requireTrimmedString(body.email, "Email is required.").toLowerCase();
    const password = requireTrimmedString(body.password, "Password is required.");
    const name = body.name?.trim() || null;

    if (!validateEmail(email)) {
      throw new AppError("Please provide a valid email address.", 400);
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters long.", 400);
    }

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new AppError("An account with this email already exists.", 409);
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, "Unable to create account.");
  }
}
