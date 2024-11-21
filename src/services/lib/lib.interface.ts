import type { requestTopic } from ".";

export function validateApiObject(rootTopic: string, api: Record<string, Function>) {
      const valid = !Object.keys(api).find((key) => {
            return typeof api[key] !== "function";
      });
      if (!valid) throw Error(`Api interface for ${rootTopic} is not valid.`);
}
export function convertToTopicApi(rootTopic: string, api: Record<string, Function>) {
      return Object.keys(api).reduce(
            (topicApi, key) => {
                  const topicKey =
                        `${normaliseRootTopic(rootTopic)}${key}` as requestTopic;
                  topicApi[topicKey] = api[key];
                  return topicApi;
            },
            {} as Record<requestTopic, Function>,
      );
}
export function normaliseRootTopic(rootTopic: string) {
      return rootTopic.endsWith("/") ? rootTopic : `${rootTopic}/`;
}
