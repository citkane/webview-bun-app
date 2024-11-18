declare var self: Worker;
declare global {
      interface requestTopics extends Topics<typeof rootTopic, typeof socketApi> {}
}

import type { Server, WebSocketHandler } from "bun";
import type { pong, Topics } from "../types/types.api";
import type { topic, Message, message, ws } from "../types/types.messaging";

import { logger } from "../utils";
import { SocketInterface } from "../constructors/SocketInterface";
import * as path from "node:path";
import { libPublisher, libServer } from "../lib";

const htmlExampleRoot = path.dirname(require.resolve("exampleapp"));

const rootTopic = "wba/server";
function socketApi(this: InstanceType<typeof Main>) {
      return {
            setHeader: (name: string, value: string) => {
                  return !!this.server
                        ? Error(`Cannot set headers of a server that is already running.`)
                        : this.headers.set(name, value);
            },
            ping: (clientRoot: string) => {
                  return {
                        pong: `${clientRoot} to ${rootTopic} to ${clientRoot}`,
                        ms: Date.now(),
                  } as pong;
            },
      };
}

export class Main extends SocketInterface {
      protected headers = new Headers();
      protected server: Server;
      private htmlRoots: string[];
      constructor(port: number, htmlRoots: string | string[] = htmlExampleRoot) {
            super(port, rootTopic, self, true);

            this.htmlRoots = Array.isArray(htmlRoots) ? htmlRoots : [htmlRoots];
            this.server = Bun.serve({
                  port,
                  websocket: this.websocketHandler,
                  fetch: this.fetchHandler,
            });

            this.startApiSocket(socketApi, this).then(() => {
                  logger.info(`The server is listening at ${this.server.url}`);
                  this.ipc?.send("ready");
            });
            this.ipc?.listen("end", async (stage: number) => {
                  switch (stage) {
                        case 0:
                              this.publish("wba/server/beforeExit");
                              break;
                        case 1:
                              this.server.stop(true);
                              this.ipc?.send("ended");
                              break;
                  }
            });
      }

      private fetchHandler = async (req: Request, server: Server) => {
            const rootTopic = new URL(req.url).searchParams.get("rootTopic");
            const upgraded = server.upgrade(req, {
                  data: { rootTopic },
            });
            // Does a Websocket upgrade if requested, else http respond with the requested resource
            return upgraded
                  ? undefined
                  : await libServer
                          .getFileMeta(req, this.htmlRoots, this.headers)
                          .then((metaOrError) =>
                                libServer.makeResponse(metaOrError, this.headers),
                          )
                          .catch((errResponse: Response) => errResponse);
      };

      private websocketHandler = {
            message: (ws, message) => this.messageHandler(ws, message),
            open: libPublisher.onOpenSocket,
            error: (err: Error) => logger.error(err),
            close: libPublisher.onCloseSocket,
      } as WebSocketHandler<{ rootTopic: string }>;

      private messageHandler = (socket: ws, messageString: message) => {
            messageString = messageString.toString();
            if (messageString.startsWith("$")) {
                  const [instruction, id, topic] = messageString.split(".");
                  switch (instruction) {
                        case "$subscribe":
                              libPublisher.onSubscribe(socket, topic as topic);
                              logger.debug(`${id} subscribed to ${topic}`);
                              break;
                        case "$unsubscribe":
                              libPublisher.onUnsubscribe(socket, topic as topic);
                              logger.debug(`${id} unsubscribed from ${topic}`);
                              break;
                  }
                  return;
            }
            const message = JSON.parse(messageString) as Message<topic>;
            const wildMessageString = JSON.stringify({
                  ...message,
                  ...{ topic: libPublisher.wildcardPlaceholder },
            });
            const { topic } = message;
            logger.debug({
                  serverPublishes: topic,
                  message,
            });
            this.server.publish(topic, messageString);
            libPublisher.fanPublish(topic, wildMessageString);
      };
}
