import { Config } from "./config.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

const botId = Deno.env.get("DISCORD_BOT_ID");

const config: Config = {
  dataDir: Deno.env.get("DATA_DIR") ?? "/data",
  tmpDir: Deno.env.get("TMP_DIR") ?? "/tmp",

  authSecret: Deno.env.get("AUTH_SECRET") as string,
  internal: {
    serverAddress:
      Deno.env.get("INTERNAL_SERVER_ADDRESS") ?? "http://localhost:8080",
  },
  oak: {
    listenOptions: {
      port: parseInt(Deno.env.get("OAK_PORT") ?? "8081"),
    },
  },
  discord: {
    token: Deno.env.get("DISCORD_TOKEN") as string,
    botId: botId ? BigInt(botId) : undefined,
  },
};

export default config;
