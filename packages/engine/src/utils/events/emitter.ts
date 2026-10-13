type Listener<TPayload> = (payload: TPayload) => void;

export class Emitter<TEvents extends Record<string, unknown>> {
  private readonly listeners: {
    [Key in keyof TEvents]?: Set<Listener<TEvents[Key]>>;
  } = {};

  on<Key extends keyof TEvents>(
    event: Key,
    listener: Listener<TEvents[Key]>,
  ): () => void {
    const listeners = (this.listeners[event] ??= new Set());
    listeners.add(listener);
    return () => this.off(event, listener);
  }

  off<Key extends keyof TEvents>(
    event: Key,
    listener: Listener<TEvents[Key]>,
  ): void {
    this.listeners[event]?.delete(listener);
  }

  emit<Key extends keyof TEvents>(event: Key, payload: TEvents[Key]): void {
    const listeners = this.listeners[event];
    if (!listeners) {
      return;
    }
    for (const listener of Array.from(listeners)) {
      listener(payload);
    }
  }
}
