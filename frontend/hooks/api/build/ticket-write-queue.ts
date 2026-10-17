const ticketWriteQueues = new Map<string, Promise<void>>();

export function enqueueTicketWrite<T>(
  projectId: number,
  ticketId: number,
  write: () => Promise<T>,
): Promise<T> {
  const key = `${projectId}:${ticketId}`;
  const previous = ticketWriteQueues.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(write);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  ticketWriteQueues.set(key, settled);
  void settled.finally(() => {
    if (ticketWriteQueues.get(key) === settled) ticketWriteQueues.delete(key);
  });
  return result;
}
