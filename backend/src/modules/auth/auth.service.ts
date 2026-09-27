import argon2 from "argon2";
import jwt from "jsonwebtoken";
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

    age: data.age,
    city: data.city,
    nationality: data.nationality,
    phone: data.phone,

    languages: data.languages,
    interests: data.interests,

    sex: data.sex,

    program: data.program,
    year: data.year,

    institutionId: data.institutionId,
  },

  select: {
    id: true,
    email: true,
    username: true,
    firstName: true,
    lastName: true,
    city: true,
    nationality: true,
    languages: true,
    interests: true,
    program: true,
    year: true,
    institutionId: true,
    role: true,
    createdAt: true,
  },
});

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordValid = await argon2.verify(
    user.password,
    password,
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    secret,
    {
      expiresIn: "7d",
    },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}