import type { Response } from "express";
import { describe, expect, test } from "bun:test";

import type { AuthenticatedRequest } from "../src/middleware/auth.middleware.js";
import {
  serveResourceFile,
  serveResourceThumbnail,
} from "../src/modules/resources/resources.controller.js";

function responseRecorder() {
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

  return { response, state };
}

describe("resource file authorization", () => {
  test.each([
    ["PDF", serveResourceFile],
    ["thumbnail", serveResourceThumbnail],
  ])("rejects unauthenticated %s access before looking up a path", async (_, handler) => {
    const { response, state } = responseRecorder();

    await handler(
      {
        params: { id: "00000000-0000-4000-8000-000000000000" },
        query: {},
      } as AuthenticatedRequest,
      response,
    );

    expect(state).toEqual({
      status: 401,
      body: { message: "Authentication required" },
    });
  });
});
