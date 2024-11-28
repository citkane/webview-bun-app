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

export interface Ports {
      /** The port of the central http server */
      serverHTTP: number;
      /** The port of the central tcp server */
      serverTcp: number;
      /** The port of the service tcp socket */
      serviceTcp: number;
}
