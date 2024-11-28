type debugThis = InstanceType<typeof Publisher>;

import type { TCPSocketListener } from "bun";
import {
      type handlerSocket,
      type Message,
      type SocketData,
      type UUID,
      libApi,
      Publisher,
      socketReadystate,
} from "..";
import logger from "../utils/util.logger";

export function makeSocketErrorString(
      rootTopic: string,
      readyState: number,
      data: SocketData,
) {
      return `socket error on ${rootTopic}, readystate: ${socketReadystate[readyState]}, ${Object.keys(
            data!,
      )
            .map((k) => `${k}: ${data![k as keyof SocketData]}`)
            .join(", ")}`;
}

export function factoryDebug(this: debugThis, filePath: string) {
      const rootTopic = this.rootTopic;
      const filename = getFileName(filePath);
      return {
            client: {
                  request(message: Message<any>) {
                        logger.debug(
                              `${filename}: `,
                              `request sent from client ${rootTopic}:`,
                              message,
                        );
                  },
                  publish(message: Message<any>) {
                        logger.debug(
                              `${filename}: `,
                              `event published from client ${rootTopic}:`,
                              message,
                        );
                  },
                  subscribe(isOnce: boolean, topic: string) {
                        logger.debug(
                              `${filename}: `,
                              isOnce
                                    ? `client ${rootTopic} subscribed to topic once: ${topic}`
                                    : `client ${rootTopic} subscribed to topic: ${topic}`,
                        );
                  },
                  unsubscribe(wasOnce: boolean, topic: string) {
                        logger.debug(
                              `${filename}: `,
                              wasOnce
                                    ? `client ${rootTopic} unsubscribed from topic once: ${topic}`
                                    : `client ${rootTopic} unsubscribed from topic: ${topic}`,
                        );
                  },
                  onEvent(topic: string, callbackCount: number) {
                        const pluralCallback =
                              callbackCount > 1 ? "callbacks" : "callback";
                        logger.debug(
                              `${filename}: `,
                              `client ${rootTopic} triggered subscription topic ${topic} with ${callbackCount} ${pluralCallback}`,
                        );
                  },
                  onRequest(command: string, uuid: UUID, src: string, targ: string) {
                        logger.debug(
                              `${filename}: `,
                              `client ${rootTopic} got request command ${command} with uuid ${uuid} from ${src} to ${targ}`,
                        );
                  },
                  tcpClosed(data: SocketData) {
                        logger.debug(
                              `${filename}: `,
                              `tcp socket client on ${rootTopic} from ${data.rootTopic} to ${data.targetTopic} on port ${data.port} closed`,
                        );
                  },
            },
            publisher: {
                  publish(message: string, size: number) {
                        if (!logger.isDebugging) return;

                        const _message = libApi.parseMessage(message);
                        const plural = size === 1 ? "subscriber" : "subscribers";
                        logger.debug(
                              `${filename}: `,
                              `publisher ${rootTopic} publishes message to ${size} ${plural}:`,
                              _message,
                        );
                  },
            },
            server: {
                  subscription(clientRoot: string, topic: string) {
                        logger.debug(
                              `${filename}: `,
                              `server ${rootTopic} subscribed client ${clientRoot} to ${topic}`,
                        );
                  },
                  unSubscription(clientRoot: string, topic: string) {
                        logger.debug(
                              `${filename}: `,
                              `server ${rootTopic} unsubscribed client ${clientRoot} from ${topic}`,
                        );
                  },
                  register(clientRoot: string, port: number) {
                        logger.debug(
                              `${filename}: `,
                              `server ${rootTopic} registered client ${clientRoot} at port ${port}`,
                        );
                  },
                  tcpCreated(server: TCPSocketListener<SocketData>) {
                        logger.debug(
                              `${filename}: `,
                              `tcp socket server ${rootTopic} created at ${server.hostname}:${server.port}`,
                        );
                  },
                  tcpEnded(server: TCPSocketListener<SocketData>) {
                        logger.debug(
                              `${filename}: `,
                              `tcp socket server ${rootTopic} at ${server.hostname}:${server.port} was closed`,
                        );
                  },
            },
            webview: {
                  run() {
                        logger.debug(
                              `${filename}: `,
                              `Webview ${rootTopic} is going to run`,
                        );
                  },
            },
      };
}
function getFileName(filePath: string) {
      return filePath.split(/[\\/]/).pop();
}

/*
const debug = {
      client: {
            request(message: Message<any>) {
                  logger.debug(
                        `${filename}: `,
                        `request sent from client ${rootTopic}:`,
                        message,
                  );
            },
            publish(message: Message<any>) {
                  logger.debug(
                        `${filename}: `,
                        `event published from client ${rootTopic}:`,
                        message,
                  );
            },
            subscribe(
                  filename: string,
                  rootTopic: string,
                  isOnce: boolean,
                  topic: string,
            ) {
                  logger.debug(
                        `${filename}: `,
                        isOnce
                              ? `client ${rootTopic} subscribed to topic once: ${topic}`
                              : `client ${rootTopic} subscribed to topic: ${topic}`,
                  );
            },
            unsubscribe(
                  filename: string,
                  rootTopic: string,
                  wasOnce: boolean,
                  topic: string,
            ) {
                  logger.debug(
                        `${filename}: `,
                        wasOnce
                              ? `client ${rootTopic} unsubscribed from topic once: ${topic}`
                              : `client ${rootTopic} unsubscribed from topic: ${topic}`,
                  );
            },
            onEvent(
                  filename: string,
                  rootTopic: string,
                  topic: string,
                  callbackCount: number,
            ) {
                  const pluralCallback = callbackCount > 1 ? "callbacks" : "callback";
                  logger.debug(
                        `${filename}: `,
                        `client ${rootTopic} triggered subscription topic ${topic} with ${callbackCount} ${pluralCallback}`,
                  );
            },
            onRequest(
                  filename: string,
                  rootTopic: string,
                  command: string,
                  uuid: UUID,
                  src: string,
                  targ: string,
            ) {
                  logger.debug(
                        `${filename}: `,
                        `client ${rootTopic} got request command ${command} with uuid ${uuid} from ${src} to ${targ}`,
                  );
            },
            tcpClosed(filename: string, serverRootTopic: string, data: SocketData) {
                  logger.debug(
                        `${filename}: `,
                        `tcp socket client from ${data.rootTopic} to ${data.targetTopic} on port ${data.port} closed`,
                  );
            },
      },
      publisher: {
            publish(filename: string, serverRoot: string, message: string, size: number) {
                  if (!logger.isDebugging) return;

                  const _message = libApi.parseMessage(message);
                  const plural = size === 1 ? "subscriber" : "subscribers";
                  logger.debug(
                        `${filename}: `,
                        `publisher ${serverRoot} publishes message to ${size} ${plural}:`,
                        _message,
                  );
            },
      },
      server: {
            subscription(
                  filename: string,
                  serverRootTopic: string,
                  rootTopic: string,
                  topic: string,
            ) {
                  logger.debug(
                        `${filename}: `,
                        `server ${serverRootTopic} subscribed client ${rootTopic} to ${topic}`,
                  );
            },
            unSubscription(
                  filename: string,
                  serverRootTopic: string,
                  rootTopic: string,
                  topic: string,
            ) {
                  logger.debug(
                        `${filename}: `,
                        `server ${serverRootTopic} unsubscribed client ${rootTopic} from ${topic}`,
                  );
            },
            register(
                  filename: string,
                  serverRootTopic: string,
                  rootTopic: string,
                  port: number,
            ) {
                  logger.debug(
                        `${filename}: `,
                        `server ${serverRootTopic} registered client ${rootTopic} at port ${port}`,
                  );
            },
            tcpCreated(
                  filename: string,
                  serverRootTopic: string,
                  hostname: string,
                  port: number,
            ) {
                  logger.debug(
                        `${filename}: `,
                        `tcp socket server ${serverRootTopic} created at ${hostname}:${port}`,
                  );
            },
      },
      webview: {
            run(filename: string, rootTopic: string) {
                  logger.debug(
                        `${filename}: `,
                        `Webview ${rootTopic} is going to run`,
                  );
            },
      },
};
*/

//export { debug };
