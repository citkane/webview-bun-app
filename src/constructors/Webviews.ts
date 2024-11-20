import { SocketInterface } from "./SocketInterface";

import { toError } from "../utils";
import { Service } from "./Service";
import paths from "../paths";
import type { callback } from "../types/types.messaging";

const serviceFilePath = paths.getAbsolutePath("src/services/service.Webview.ts");

export class Webviews extends SocketInterface {
      private handles = 0;

      constructor(
            private serverPort: number,
            rootTopic: string,
      ) {
            super(serverPort, rootTopic);
      }

      protected createWebview = (rootTopic: string) => {
            const service = new Service<"childProcess">(
                  serviceFilePath,
                  "childProcess",
                  this.serverPort,
                  rootTopic,
            );

            service.ipc?.listen("ended", () => {
                  this.handles--;
                  if (!this.handles) this.publish("wba/webviews/allClosed");
                  service.terminate();
            });
            return new Promise<ReturnType<typeof publicApi>>((resolve) => {
                  service.ipc?.listen("ready", (handle) => {
                        this.handles++;
                        resolve(publicApi(service, handle));
                  });
            });
      };
}

function publicApi(service: Service<"childProcess">, handle: number) {
      const { ipc, terminate } = service;
      let oncloseCallback: callback;
      ipc?.listen("ended", callOnClose);
      return {
            handle,
            terminate,
            onclose,
            navigate: (url?: string) => {
                  ipc?.send("message", {
                        topic: "navigate",
                        parameters: url ? [url] : [],
                  });
            },
            setTitle: (title: string) => {
                  ipc?.send("message", {
                        topic: "setTitle",
                        parameters: [title],
                  });
            },
            run: () => {
                  ipc?.send("message", { topic: "run" });
            },
      };
      function callOnClose() {
            if (!oncloseCallback) return;
            try {
                  oncloseCallback(service);
            } catch (error) {
                  oncloseCallback(null, toError(error));
            }
      }
      function onclose(callback: callback<typeof service>) {
            oncloseCallback = callback;
      }
}
