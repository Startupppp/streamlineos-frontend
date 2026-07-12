export interface BuilderCondition {
  field: string;
  operator: string;
  value: string;
}

export type NodeType = "action" | "wait";

export interface BuilderNode {
  id: string;
  type: string;
  config?: Record<string, string>;
  nodeType: NodeType;
  waitHours?: number;
}

export interface BuilderState {
  name: string;
  triggerEvent: string;
  conditions: BuilderCondition[];
  nodes: BuilderNode[];
  isActive: boolean;
}

export type BuilderAction =
  | { type: "SET_NAME"; name: string }
  | { type: "SET_TRIGGER"; event: string }
  | { type: "ADD_CONDITION" }
  | { type: "UPDATE_CONDITION"; index: number; field: keyof BuilderCondition; value: string }
  | { type: "REMOVE_CONDITION"; index: number }
  | { type: "ADD_NODE"; nodeType: NodeType }
  | { type: "UPDATE_NODE_ACTION"; nodeId: string; actionKey: string }
  | { type: "UPDATE_NODE_CONFIG"; nodeId: string; configKey: string; value: string }
  | { type: "UPDATE_NODE_WAIT_HOURS"; nodeId: string; hours: number }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "REORDER_NODES"; nodes: BuilderNode[] }
  | { type: "SET_ACTIVE"; isActive: boolean }
  | { type: "LOAD"; state: BuilderState };

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.name };
    case "SET_TRIGGER":
      return { ...state, triggerEvent: action.event };
    case "ADD_CONDITION":
      return { ...state, conditions: [...state.conditions, { field: "", operator: "eq", value: "" }] };
    case "UPDATE_CONDITION": {
      const updated = state.conditions.map((c, i) =>
        i === action.index ? { ...c, [action.field]: action.value } : c,
      );
      return { ...state, conditions: updated };
    }
    case "REMOVE_CONDITION":
      return { ...state, conditions: state.conditions.filter((_, i) => i !== action.index) };
    case "ADD_NODE": {
      const newNode: BuilderNode = {
        id: `node-${Date.now()}`,
        type: action.nodeType === "wait" ? "wait" : "",
        config: {},
        nodeType: action.nodeType,
        waitHours: action.nodeType === "wait" ? 24 : undefined,
      };
      return { ...state, nodes: [...state.nodes, newNode] };
    }
    case "UPDATE_NODE_ACTION": {
      const updated = state.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, type: action.actionKey } : n,
      );
      return { ...state, nodes: updated };
    }
    case "UPDATE_NODE_CONFIG": {
      const updated = state.nodes.map((n) =>
        n.id === action.nodeId
          ? { ...n, config: { ...(n.config ?? {}), [action.configKey]: action.value } }
          : n,
      );
      return { ...state, nodes: updated };
    }
    case "UPDATE_NODE_WAIT_HOURS": {
      const updated = state.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, waitHours: action.hours } : n,
      );
      return { ...state, nodes: updated };
    }
    case "REMOVE_NODE":
      return { ...state, nodes: state.nodes.filter((n) => n.id !== action.nodeId) };
    case "REORDER_NODES":
      return { ...state, nodes: action.nodes };
    case "SET_ACTIVE":
      return { ...state, isActive: action.isActive };
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}

export const initialBuilderState: BuilderState = {
  name: "",
  triggerEvent: "",
  conditions: [],
  nodes: [],
  isActive: true,
};
