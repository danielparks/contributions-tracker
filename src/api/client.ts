/**
 * Type-safe API client for the backend.
 *
 * This client uses the Oxide OpenAPI generator which provides excellent error
 * handling including proper handling of empty 500 responses.
 */

import Api from "./Api.ts";
import type { ApiResult } from "./Api.ts";

/**
 * API client instance configured for the backend.
 *
 * The baseURL defaults to the current origin, which works with the Vite dev
 * proxy that forwards `/api` to the backend on port 3000.
 */
export const api = new Api({
  host: import.meta.env.VITE_BACKEND_URL || "",
});

/**
 * Exchange GitHub OAuth code for access token.
 *
 * @param code - The authorization code from GitHub OAuth callback
 * @returns The access token on success, or undefined on error
 */
export async function exchangeOAuthCode(
  code: string,
): Promise<string | undefined> {
  const result = await api.methods.oauthCallback({ query: { code } });

  // Handle all error cases
  if (result.type === "error") {
    console.error("OAuth callback API error:", result.data);
    return undefined;
  }

  if (result.type === "client_error") {
    console.error(
      "OAuth callback client error:",
      result.error.message,
      "Response text:",
      result.text,
    );
    return undefined;
  }

  // Success case
  return result.data.accessToken;
}

/**
 * Check API health status.
 *
 * @returns Result object with status and optional error
 */
export async function checkHealth(): Promise<
  { ok: true; status: string } | { ok: false; error: string }
> {
  const result = await api.methods.healthCheck({});

  if (result.type === "error") {
    return { ok: false, error: result.data.message };
  }

  if (result.type === "client_error") {
    return { ok: false, error: result.error.message };
  }

  return { ok: true, status: result.data.status };
}

/**
 * Type guard to check if an API result is successful.
 */
export function isSuccess<T>(result: ApiResult<T>): result is Extract<
  ApiResult<T>,
  { type: "success" }
> {
  return result.type === "success";
}

/**
 * Type guard to check if an API result is an error.
 */
export function isError<T>(result: ApiResult<T>): result is Extract<
  ApiResult<T>,
  { type: "error" | "client_error" }
> {
  return result.type === "error" || result.type === "client_error";
}
