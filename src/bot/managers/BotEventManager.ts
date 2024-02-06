import { Bot, EventHandlers } from "discordeno";

type Handler = (...args: any[]) => any;
type Event = keyof EventHandlers;
type HandlerData = {
  id: string;
  handler: Handler;
  once?: boolean;
};
type Events = Record<Event, Record<string, HandlerData>>;

export default class BotEventManager {
  private bot: Bot;
  private events: Events;

  constructor(bot: Bot) {
    this.bot = bot;
    this.events = {} as Events;
  }

  public addEventListener<E extends Event>(
    eventName: E,
    handler: EventHandlers[E],
    once?: boolean
  ) {
    const id = crypto.randomUUID();
    if (!this.events[eventName]) this.events[eventName] = {};
    this.events[eventName as Event][id] = {
      id,
      handler,
      once,
    };

    this.registerEvents();

    return id;
  }

  public removeEventListener(id: string) {
    let eventName: Event | undefined = undefined;

    for (const [currEventName, handlers] of Object.entries(this.events)) {
      for (const currId in handlers) {
        if (currId === id) eventName = currEventName as Event;
      }
    }

    if (!eventName) return;

    delete this.events[eventName][id];

    this.registerEvents();
  }

  public on<E extends Event>(eventName: E, handler: EventHandlers[E]) {
    return this.addEventListener(eventName, handler, false);
  }

  public off(id: string) {
    this.removeEventListener(id);
  }

  public once<E extends Event>(eventName: E, handler: EventHandlers[E]) {
    return this.addEventListener(eventName, handler, true);
  }

  public removeEventListeners(eventName: Event) {
    delete this.events[eventName];

    this.registerEvents();
  }

  private registerEvents() {
    for (const eventName in this.bot.events) {
      this.bot.events[eventName as Event] = () => {};

      let handlers: HandlerData[] = [];
      if (this.events[eventName as Event])
        handlers = Object.values(this.events[eventName as Event]);
      if (handlers.length === 0) continue;

      this.bot.events[eventName as Event] = (...args: any[]) => {
        for (const { id, handler, once } of handlers) {
          handler(...args);
          if (once) this.removeEventListener(id);
        }
      };
    }
  }
}
