/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as chat from "../chat.js";
import type * as chatQueries from "../chatQueries.js";
import type * as cronHandlers from "../cronHandlers.js";
import type * as crons from "../crons.js";
import type * as dodoPayments from "../dodoPayments.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as presence from "../presence.js";
import type * as sessions from "../sessions.js";
import type * as sessionsQueries from "../sessionsQueries.js";
import type * as subscriptionQueries from "../subscriptionQueries.js";
import type * as subscriptions from "../subscriptions.js";
import type * as webhookHelpers from "../webhookHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  chat: typeof chat;
  chatQueries: typeof chatQueries;
  cronHandlers: typeof cronHandlers;
  crons: typeof crons;
  dodoPayments: typeof dodoPayments;
  http: typeof http;
  leaderboard: typeof leaderboard;
  presence: typeof presence;
  sessions: typeof sessions;
  sessionsQueries: typeof sessionsQueries;
  subscriptionQueries: typeof subscriptionQueries;
  subscriptions: typeof subscriptions;
  webhookHelpers: typeof webhookHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
