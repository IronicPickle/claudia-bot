import { path } from "../../deps/deps.ts";
import {
  Bot,
  CreateApplicationCommand,
  CreateSlashApplicationCommand,
  Interaction,
  InteractionResponse,
  InteractionResponseTypes,
  InteractionTypes,
} from "../../deps/discordeno.ts";
import { dataDir } from "../../lib/constants/generic.ts";
import { EventManagerBot } from "../../lib/ts/eventManagerBot.ts";
import { isString, log } from "../../lib/utils/generic.ts";

const isEventManagerBot = (bot: any): bot is Bot & EventManagerBot =>
  !!bot.eventManager;

interface Command {
  data: CreateApplicationCommand;
  handler: (
    interaction: Interaction
  ) => Promise<string | InteractionResponse | undefined>;
}

export default class BotCommandManager {
  private bot: Bot;

  private commandsPath = path.join(dataDir, "commands.json");
  private commands: Command[] = [];

  constructor(bot: Bot) {
    log("[Bot Commands]", `Initialised with path: '${this.commandsPath}'`);

    this.bot = bot;

    if (!this.checkFileExists()) this.writeCommands();
  }

  checkFileExists() {
    const config = this.readComamnds();
    return config != null;
  }

  readComamnds() {
    log("[Bot Commands]", `Reading from file`);
    try {
      return JSON.parse(
        Deno.readTextFileSync(this.commandsPath)
      ) as CreateApplicationCommand[];
    } catch (_err) {
      return null;
    }
  }

  writeCommands() {
    log("[Bot Commands]", `Writing to file`);
    if (!this.readDir()) this.writeDir();
    try {
      Deno.writeTextFileSync(
        this.commandsPath,
        JSON.stringify(
          this.commands.map(({ data }) => data),
          null,
          2
        ),
        {
          create: true,
        }
      );
    } catch (err) {
      console.error(err);
    }
  }

  readDir() {
    try {
      return Deno.readDirSync(dataDir);
    } catch (_err) {
      return null;
    }
  }

  writeDir() {
    log("[Bot Commands]", `Creating data dir '${dataDir}'`);
    try {
      return Deno.mkdirSync(dataDir);
    } catch (err) {
      console.error(err);
    }
  }

  registerListener() {
    log("[Bot Commands]", `Registering listener`);

    if (!isEventManagerBot(this.bot)) return;

    this.bot.eventManager.on("interactionCreate", async (_bot, interaction) => {
      const command = this.commands.find(
        ({ data: { name } }) => name === interaction.data?.name
      );

      if (interaction.type === InteractionTypes.ApplicationCommand && command) {
        const dataOrMsg = await command.handler(interaction);

        if (!dataOrMsg) return;

        const interactionResponse: InteractionResponse = isString(dataOrMsg)
          ? {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: dataOrMsg,
              },
            }
          : dataOrMsg;

        this.bot.helpers.sendInteractionResponse(
          interaction.id,
          interaction.token,
          interactionResponse
        );
      }
    });
  }

  async saveCommand(
    name: string,
    command: Omit<CreateSlashApplicationCommand, "name">,
    handler: (
      interaction: Interaction
    ) => Promise<string | InteractionResponse | undefined>
  ) {
    log("[Bot Commands]", `Saving command '${name}'`);

    const newCommand = {
      data: {
        name,
        ...command,
      },
      handler,
    };

    const commandIndex = this.commands.findIndex(
      ({ data }) => data.name === name
    );

    if (commandIndex > -1) {
      this.commands[commandIndex] = newCommand;
    } else {
      this.commands.push(newCommand);
    }

    this.writeCommands();
  }

  registerCommands() {
    const commands = this.readComamnds();
    if (!commands) return;

    log(
      "[Bot Commands]",
      `Registering ${commands.length} saved commands`,
      commands.map(({ name }) => name)
    );

    return this.bot.helpers.upsertGlobalApplicationCommands(commands);
  }
}
