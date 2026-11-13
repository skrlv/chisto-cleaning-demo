import { createLeadHandler } from "../../../server/lead-handler.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Credentials are read only in this server route; never exposed to the client bundle.
export const POST = createLeadHandler({
  env: () => ({
    APP_MODE: process.env.APP_MODE,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    TRUST_PROXY: process.env.TRUST_PROXY,
  }),
});
