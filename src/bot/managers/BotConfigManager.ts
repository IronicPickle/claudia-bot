import { join } from "path";
import { dataDir } from "@constants/generic.ts";
import { log } from "@utils/generic.ts";

export interface GuildConfig {
  active: boolean;
}

export interface BotConfig {
  guilds: Record<string, GuildConfig>;
}

const defaultBotConfig: BotConfig = {
  guilds: {},
};

const defaultGuildConfig: GuildConfig = {
  active: true,
};

export default class BotConfigManager {
  private configPath = join(dataDir, "config.json");
  private config: BotConfig = defaultBotConfig;

  constructor() {
    log("[Bot Config]", `Initialised with path: '${this.configPath}'`);

    if (!this.checkFileExists()) this.writeConfig();
  }

  checkFileExists() {
    const config = this.readConfig();
    return config != null;
  }

  readConfig() {
    log("[Bot Config]", `Reading from file`);
    try {
      this.config = JSON.parse(Deno.readTextFileSync(this.configPath));
      return this.config;
    } catch (_err) {
      return null;
    }
  }

  writeConfig() {
    log("[Bot Config]", `Writing to file`);
    if (!this.readDir()) this.writeDir();
    try {
      Deno.writeTextFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        {
          create: true,
        }
      );
    } catch (err) {
      console.error(err);
    }
  }

  setConfig(config: BotConfig) {
    this.config = config;
  }

  readDir() {
    try {
      return Deno.readDirSync(dataDir);
    } catch (_err) {
      return null;
    }
  }

  writeDir() {
    log("[Bot Config]", `Creating data dir '${dataDir}'`);
    try {
      return Deno.mkdirSync(dataDir);
    } catch (err) {
      console.error(err);
    }
  }

  getGuildConfig(guildId: bigint): GuildConfig | undefined {
    this.readConfig();
    const guildConfig: GuildConfig | undefined =
      this.config.guilds[guildId.toString()];
    return guildConfig ? { ...guildConfig } : undefined;
  }

  updateGuildConfig(guildId: bigint, guildConfig: GuildConfig) {
    this.config.guilds[guildId.toString()] = guildConfig;
    this.writeConfig();
  }

  initGuildConfig(guildId: bigint) {
    this.updateGuildConfig(guildId, defaultGuildConfig);
  }
}
