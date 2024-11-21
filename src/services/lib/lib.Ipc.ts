type ipcTopics = (typeof ipcTopics)[number];
type workerParent = InstanceType<typeof Worker>; //['onmessage'];
type workerChild = Worker; //['onmessage'];
type processParent = Subprocess;
type processChild = NodeJS.Process; //['on'];
type postMaster = workerParent | workerChild | processParent | processChild;
import type { Subprocess } from "bun";

import { EventEmitter } from "node:events";

const ipcTopics = ["message", "error", "ready", "ended", "end"] as const;

export class LibIpc {
      private eventEmitter = new EventEmitter();

      constructor(private postMaster: postMaster) {
            switch (true) {
                  case "on" in postMaster:
                        postMaster["on"]("message", (data: any) => {
                              const { topic, message } = LibIpc.parseSystemMessage(data);
                              this._dispatchMessage(topic, message);
                        });
                        break;
                  case "onmessage" in postMaster:
                        postMaster.onmessage = ({ data }) => {
                              const { topic, message } = LibIpc.parseSystemMessage(data);
                              this._dispatchMessage(topic, message);
                        };
                        break;
            }
      }

      listen = this.eventEmitter.on as (
            topic: ipcTopics,
            callback: (data?: any) => void,
      ) => void;
      send = (topic: ipcTopics, message?: any): void => {
            message = LibIpc.makeSystemMessage(topic, message);
            this.post(message);
      };

      private post(message: string) {
            const { postMaster } = this;
            if ("postMessage" in postMaster) return postMaster.postMessage(message);
            if ("send" in postMaster) return postMaster.send!(message);

            throw Error("IPC postMaster not found.");
      }
      private _dispatchMessage = this.eventEmitter.emit;
      static makeSystemMessage(topic: ipcTopics, message?: any) {
            if (message === undefined) return `$${topic}`;
            message =
                  typeof message === "string" || typeof message === "number"
                        ? message
                        : JSON.stringify(message);
            message = `$${topic}.${message}`;
            return message;
      }
      static parseSystemMessage(data: string) {
            const fragments = data.split(".");
            const topic = fragments.shift()!.replace("$", "");
            let message: any = fragments.join(".");
            try {
                  message = JSON.parse(message);
            } catch (error) {
                  message = message;
            }
            return { topic, message };
      }
}
