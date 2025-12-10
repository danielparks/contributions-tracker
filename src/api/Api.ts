/* eslint-disable */

import type { FetchParams } from "./http-client.ts";
import { HttpClient } from "./http-client.ts";

export type {
  ApiConfig,
  ApiResult,
  ErrorBody,
  ErrorResult,
} from "./http-client.ts";

/**
 * Response from `/api/oauth/callback`
 */
export type CallbackSuccessResponse = {
  /** The access token from GitHub. */
  "accessToken": string;
};

/**
 * Response from `/api/health`
 */
export type HealthResponse = {
  /** Health status (always `"ok"`). */
  "status": string;
};

export interface OauthCallbackQueryParams {
  code: string;
}

type EmptyObj = Record<string, never>;
export class Api extends HttpClient {
  methods = {
    /**
     * Handle `/api/health`
     */
    healthCheck: (_: EmptyObj, params: FetchParams = {}) => {
      return this.request<HealthResponse>({
        path: `/api/health`,
        method: "GET",
        ...params,
      });
    },
    /**
     * Handle `/api/oauth/callback`
     */
    oauthCallback: ({
      query,
    }: { query: OauthCallbackQueryParams }, params: FetchParams = {}) => {
      return this.request<CallbackSuccessResponse>({
        path: `/api/oauth/callback`,
        method: "GET",
        query,
        ...params,
      });
    },
  };
  ws = {};
}

export default Api;
