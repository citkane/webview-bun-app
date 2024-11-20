import type { Message } from "../types/types.messaging";
import type { Pointer } from "bun:ffi";

import { logger, makeHttpUrl } from "../utils";
import conf from "../conf";
import { LibIpc } from "../lib";
import { Service } from "../constructors/Service";
import paths from "../paths";
import { Webview } from "webview-bun-lib";

const servicePath = paths.getAbsolutePath("src/services/service.Window.ts");

export class Main {
      webview: Webview;
      id: Pointer;
      private ipc = new LibIpc(process);
      constructor(
            private port: number,
            rootTopic: string,
      ) {
            this.webview = new Webview(conf.webviewDebug);
            this.id = this.webview.id;
            this.ipc.listen("message", this.messageHandler);
            new Service<"window">(servicePath, "window", port, rootTopic).child.then(
                  (wbaString) => {
                        this.ipc.send("ready", this.id);
                        this.webview.init(wbaString);
                        this.navigate();
                  },
            );
      }
      navigate = (url: URL = makeHttpUrl(this.port)) => {
            this.webview.navigate(url.toString());
      };
      run = () => {
            this.webview.run();
            this.ipc.send("ended", this.id);
      };
      setTitle = (title: string) => {
            this.webview.setTitle(title);
      };

      private messageHandler = (message: Message) => {
            const { topic, parameters } = message;
            const key = topic as keyof this;
            !!this[key] && typeof this[key] === "function"
                  ? this[key](...(parameters || []))
                  : logger.error(Error(`Did not find webview service command ${topic}`));
      };
}
