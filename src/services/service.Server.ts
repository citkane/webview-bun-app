declare var self: Worker;
declare global {
      interface requestTopics extends Topics<typeof rootTopic, typeof socketApi> {}
}

import type { pong, Ports, Topics } from ".";

import * as path from "node:path";
import { libApi, libServer, logger, SocketServer } from ".";

const htmlExampleRoot = path.dirname(require.resolve("exampleapp"));
const rootTopic = "wba/server";

function socketApi(this: InstanceType<typeof Main>) {
      return {
            setHeader: (name: string, value: string) => {
                  return !!this.serverHTTP
                        ? Error(`Cannot set headers of a server that is already running.`)
                        : this.headers.set(name, value);
            },
            ping: (clientRoot = "anonymous") => {
                  const pong: pong = {
                        pong: `${clientRoot} to ${rootTopic} to ${clientRoot}`,
                        ms: Date.now(),
                  };
                  return pong;
            },
      };
}

export class Main extends SocketServer {
      protected headers = new Headers();
      protected serverHTTP;
      private htmlRoots: string[];
      constructor(ports: Ports, htmlRoots: string | string[] = htmlExampleRoot) {
            super(ports, libApi.makeTopic(rootTopic), self);
            this.htmlRoots = Array.isArray(htmlRoots) ? htmlRoots : [htmlRoots];
            this.serverHTTP = Bun.serve({
                  port: ports.serverHTTP,
                  //websocket: this.websocketHandler,
                  fetch: this.fetchHandler,
            });

            this.ipc?.listen("end", (stage: number) => {
                  switch (stage) {
                        case 0:
                              this.publish("wba/server/beforeExit");
                              break;
                        case 1:
                              this.serverHTTP.stop(true);
                              this.serverHTTP.unref();
                              this.serverTcp.stop(true);
                              this.serverTcp.unref();
                              this.ipc?.send("ended");
                              this.ipc?.send("end");
                              break;
                  }
            });

            this.apiInit(this, socketApi).then(() => {
                  this.ipc?.send("ready");
                  logger.info(`The http server is listening at ${this.serverHTTP.url}`);
                  logger.info(
                        `The tcp server is listening at port ${this.ports.serverTcp}`,
                  );
            });
      }
      private fetchHandler = async (req: Request) => {
            return await libServer
                  .getFileMeta(req, this.htmlRoots, this.headers)
                  .then(libServer.makeResponse)
                  .catch((errResponse: Response) => errResponse);
      };
}
