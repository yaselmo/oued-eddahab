import type { Response } from "express";
import { describe, expect, test } from "bun:test";

import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";
import { addResourceView } from "../src/modules/resources/resources.controller.js";

describe("resource view authorization", () => {
  test("rejects an unauthenticated view before writing anything", async () => {
    const state: { status?: number; body?: unknown } = {};
    const response = {
      status(code: number) {
        state.status = code;
        return response;
      },
      json(body: unknown) {
        state.body = body;
        return response;
      },
    } as unknown as Response;

    await addResourceView(
      {
        params: { id: "00000000-0000-4000-8000-000000000000" },
      } as AuthenticatedRequest,
      response,
    );

    expect(state).toEqual({
      status: 401,
      body: { message: "Authentication required" },
    });
  });
});
