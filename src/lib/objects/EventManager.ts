import { Bot } from "../../deps/discordeno.ts";

type Handler = (...args: any[]) => any;
type HandlerData = {
  id: string;
  handler: Handler;
  once?: boolean;
};

export default class EventManager<
  Event extends string,
  EventHandlers extends Record<Event, Handler>,
  Events extends Record<Event, Record<string, HandlerData>> = Record<
    Event,
    Record<string, HandlerData>
  >
> {
  protected events: Events;

  constructor() {
    this.events = {} as Events;
  }

  protected dispatch<E extends Event>(
    event: E,
    ...args: Parameters<EventHandlers[E]>
  ) {
    for (const { handler } of Object.values(this.events[event] ?? {})) {
      handler(args);
    }
  }

  public addEventListener<E extends Event>(
    eventName: E,
    handler: EventHandlers[E],
    once?: boolean
  ) {
    const id = crypto.randomUUID();
    if (!this.events[eventName]) this.events[eventName] = {} as Events[E];
    this.events[eventName][id] = {
      id,
      handler,
      once,
    };

    return id;
  }

  public removeEventListener(id: string) {
    let eventName: Event | undefined = undefined;

    for (const [currEventName, handlers] of Object.entries(this.events)) {
      for (const currId in handlers as Handler[]) {
        if (currId === id) eventName = currEventName as Event;
      }
    }

    if (!eventName) return;

    delete this.events[eventName][id];
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
  }
}
