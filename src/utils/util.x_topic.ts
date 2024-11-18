export type Topic = string & {
      __brand: "Topic";
};

export function topic(topic: string): Topic {
      if (topic.length === 0) {
            throw new Error("Topic must contain at least 1 character");
      }
      if (topic.startsWith("/")) {
            throw new Error("Topic should not start with a forward slash");
      }
      if (topic.includes(" ")) {
            throw new Error("Topic should not contain spaces");
      }
      if (!/^[\x00-\x7F]*$/.test(topic)) {
            throw new Error("Topic should only contain ASCII characters");
      }
      if (topic.startsWith("$") && !topic.startsWith("$SYS/")) {
            throw new Error("Topic should not start with $");
      }
      return topic as Topic;
}
