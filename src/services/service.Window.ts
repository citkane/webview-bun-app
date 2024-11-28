import type { SocketInterface, logger as _logger } from ".";

type logger = typeof _logger;
declare global {
      let wba: InstanceType<typeof SocketInterface> & { logger: logger };
      const wba_logger_log: logger["log"];
      const wba_publish: typeof wba.publish;
}

import { loggerKeys, apiKeys } from "./lib/lib.api";

class Main {
      logger = {} as logger;
      constructor() {
            setTimeout(() => {
                  loggerKeys.forEach((key) => {
                        const k = key as keyof logger;
                        this.logger[k] = eval(`wba_logger_${k}`);
                  });
                  apiKeys.forEach((key) => {
                        const k = key as keyof typeof wba;
                        wba[k] = eval(`wba_${k}`);
                  });
                  wba.logger.log("Hello from the bound logger");
                  wba.publish("wba/webviews/test", "A test message from the far side");
                  //wba.ping().then((pong) => console.log(pong));
            });
      }
}

//@ts-expect-error
window.wba = new Main(); //new Main(ARG0, ARG1);
