import guildCreateEvent from "./guildCreateEvent.ts";
import guildDeleteEvent from "./guildDeleteEvent.ts";
import guildUpdateEvent from "./guildUpdateEvent.ts";
import guildMemberAddEvent from "./guildMemberAddEvent.ts";
import guildMemberRemovevent from "./guildMemberRemoveEvent.ts";

export default () => {
  guildCreateEvent();
  guildDeleteEvent();
  guildUpdateEvent();
  guildMemberAddEvent();
  guildMemberRemovevent();
};
