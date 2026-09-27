import type { Request, Response } from "express";
import {
  loginSchema,
  registerSchema,
} from "./auth.schema.js";

import {
  loginUser,
  registerUser,
} from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      errors: result.error.flatten(),
    });
  }

  try {
    const user = await registerUser(result.data);

    return res.status(201).json({
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email or username already exists"
    ) {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid login data",
      errors: result.error.flatten(),
    });
  }

  try {
    const auth = await loginUser(
      result.data.email,
      result.data.password,
    );

    return res.status(200).json({
      message: "Login successful",
      ...auth,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      return res.status(401).json({
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
