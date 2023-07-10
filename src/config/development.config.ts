import { Config } from "./config.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

const botId = Deno.env.get("DISCORD_BOT_ID");

const config: Config = {
  dataDir: Deno.env.get("DATA_DIR") ?? "/data",
  tmpDir: Deno.env.get("TMP_DIR") ?? "/tmp",
  discord: {
    token: Deno.env.get("DISCORD_TOKEN"),
    botId: botId ? BigInt(botId) : undefined,
  },
  oak: {
    listenOptions: {
      port: parseInt(Deno.env.get("OAK_PORT") ?? "8080"),
    },
  },
};

export default config;
