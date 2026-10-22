"use client";

import { Globals } from "@react-spring/web";
import { createContext, useContext, useLayoutEffect } from "react";

export const isRobotView = (): boolean =>
  typeof document !== "undefined" &&
  document.querySelector('meta[name="x-robot-view"]') !== null;

if (isRobotView()) {
  window.__robotView = true;
  Globals.assign({ skipAnimation: true });
}

const RobotContext = createContext(false);

export const useRobot = (): boolean => useContext(RobotContext);

export const RobotProvider = ({
  robot,
  children,
}: {
  robot: boolean;
  children: React.ReactNode;
}) => <RobotContext.Provider value={robot}>{children}</RobotContext.Provider>;

export const RobotView = () => {
  useLayoutEffect(() => {
    window.__robotView = true;
    Globals.assign({ skipAnimation: true });
  }, []);
  return <meta name="x-robot-view" content="1" />;
};
