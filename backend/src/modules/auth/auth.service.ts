import argon2 from "argon2";

import prisma from "../../lib/prisma.js";
import type { RegisterInput } from "./auth.schema.js";

export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { username: data.username },
      ],
    },
  });

  if (existingUser) {
    throw new Error("Email or username already exists");
  }

  const hashedPassword = await argon2.hash(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      program: data.program,
      year: data.year,
    },

    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      program: true,
      year: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}