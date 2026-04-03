import type { AppEvent } from '../shared/types/events';

type EventHandler = (event: AppEvent) => void;

class EventBus {
  private handlers = new Set<EventHandler>();

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: AppEvent): void {
    for (const h of this.handlers) h(event);
  }
}

export const eventBus = new EventBus();
