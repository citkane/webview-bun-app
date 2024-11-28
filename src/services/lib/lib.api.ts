import type {
      _SYS,
      apiFactory,
      Constructor,
      eventTopic,
      Message,
      SYS,
      Topic,
      UUID,
} from "..";
import { $SYS } from "../../types/types.messaging";

import logger from "../utils/util.logger";

export const loggerKeys = Object.keys(logger);
export const apiKeys = ["publish", "subscribe", "unsubscribe", "once", "request", "ping"];

export function normaliseRootTopic(rootTopic: string) {
      return rootTopic.endsWith("/") ? rootTopic : `${rootTopic}/`;
}

export function makeTopic(topic: string): Topic {
      if (topic.length === 0) {
            throw Error("Topic must contain at least 1 character");
      }
      if (topic.startsWith("/")) {
            throw Error("Topic should not start with a forward slash");
      }
      if (topic.includes(" ")) {
            throw Error("Topic should not contain spaces");
      }
      if (!/^[\x00-\x7F]*$/.test(topic)) {
            throw Error("Topic should only contain ASCII characters");
      }
      if (topic.startsWith("$")) {
            throw Error("Topic should not start with $");
      }
      return topic as Topic;
}

export const makeMessage = {
      request(
            sourceRootTopic: Topic,
            targetRootTopic: Topic,
            command: string,
            params: any[],
            uuid: UUID,
      ) {
            return {
                  src: sourceRootTopic,
                  targ: targetRootTopic,
                  command,
                  params,
                  uuid,
            };
      },
      response(targetRootTopic: Topic, payload: any, uuid: UUID, err?: any) {
            return {
                  targ: targetRootTopic,
                  res: payload,
                  err,
                  uuid,
            };
      },
      event(topic: eventTopic, payload: any, err?: any) {
            return {
                  topic,
                  payload,
                  err,
            };
      },
};

export function parseMessage<
      kind extends keyof typeof makeMessage = keyof typeof makeMessage,
>(data: string) {
      const message = JSON.parse(data);
      return message as Message<kind>;
}
/**
 * If a message starts with "$SYS", it is a special internal system message.
 * "." is used as a separator in this case so that "/" separated identifiers can be passed unambiguously
 */
export function parseMessageSys(data: string) {
      const [_SYS, instruction, rootTopic, topic, port, net] = data.split(".") as SYS;

      return {
            instruction,
            rootTopic,
            topic,
            port: parseInt(port.toString()),
            net: net ? JSON.parse(net.toString()) : net,
      };
}

export function getMessageKind(
      data: Message<any> | string,
): keyof typeof makeMessage | "system" {
      if (typeof data === "object") return _messageKind(data);
      if (isSystemMessage(data)) return "system";
      const has = _in.bind(data);
      if (!!has("src") && !!has("targ") && !!has("command") && !!has("uuid"))
            return "request";
      if (!!has("targ") && !!has("uuid")) return "response";
      return "event";
}
function _messageKind(data: Message<any>): keyof typeof makeMessage {
      const { topic, uuid, command, params, src, targ, res, err, payload } = data;
      if (!!src && !!targ && !!command && !!uuid) return "request";
      if (!!targ && !!uuid) return "response";
      return "event";
}
function _in(this: string, needle: string) {
      return this.includes(`"${needle}":`);
}
function isSystemMessage(data: string) {
      return data.startsWith($SYS);
}

export function assertApiFactory(factory: apiFactory | false) {
      if (!factory) return emptyApiFactory;
      return factory;
}
function emptyApiFactory(this: InstanceType<Constructor>) {
      return {};
}
