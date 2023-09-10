import guildCreateEvent from "./guildCreateEvent.ts";
import guildDeleteEvent from "./guildDeleteEvent.ts";
import guildUpdateEvent from "./guildUpdateEvent.ts";
import guildMemberAddEvent from "./guildMemberAddEvent.ts";

export default () => {
  guildCreateEvent();
  guildDeleteEvent();
  guildUpdateEvent();
  guildMemberAddEvent();
};
