interface StatusLayer {
  id: symbol;
  status: string;
}

interface StatusQueue {
  baseStatus: string;
  layers: StatusLayer[];
}

export interface StatusTransition {
  key: string;
  id: symbol;
  fromStatus: string;
  toStatus: string;
}

const statusQueues = new Map<string, StatusQueue>();

export function beginStatusTransition(
  projectId: number,
  ticketId: number,
  currentStatus: string,
  nextStatus: string,
): StatusTransition {
  const key = `${projectId}:${ticketId}`;
  const queue = statusQueues.get(key) ?? {
    baseStatus: currentStatus,
    layers: [],
  };
  const fromStatus = queue.layers.at(-1)?.status ?? queue.baseStatus;
  const id = Symbol(key);
  queue.layers.push({ id, status: nextStatus });
  statusQueues.set(key, queue);
  return { key, id, fromStatus, toStatus: nextStatus };
}

export function settleStatusTransition(
  transition: StatusTransition,
  succeeded: boolean,
): { fromStatus: string; toStatus: string } {
  const queue = statusQueues.get(transition.key);
  if (!queue) return {
    fromStatus: transition.toStatus,
    toStatus: transition.toStatus,
  };
  const previousDesired = queue.layers.at(-1)?.status ?? queue.baseStatus;
  const index = queue.layers.findIndex((layer) => layer.id === transition.id);
  if (index >= 0) {
    const layer = queue.layers[index];
    if (succeeded) queue.baseStatus = layer.status;
    queue.layers.splice(index, 1);
  }
  const desired = queue.layers.at(-1)?.status ?? queue.baseStatus;
  if (queue.layers.length === 0) statusQueues.delete(transition.key);
  return { fromStatus: previousDesired, toStatus: desired };
}
