import type { Subprocess } from "bun";

export type serviceTypes = "childProcess" | "childWorker" | "window";
export type worker = InstanceType<typeof Worker>;
export type process = Subprocess;
export type child<T extends serviceTypes | serviceTypes> = T extends "window"
      ? Promise<string>
      : T extends "childWorker"
        ? worker
        : T extends "childProcess"
          ? process
          : Promise<string> | worker | process;
