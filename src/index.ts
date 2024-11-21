declare global {
      interface eventTopics {
            "wba/webviews/allClosed": void;
            "wba/server/beforeExit": void;
      }
}

import paths from "./paths";
import { getOpenPort, logger, Service, Webviews, conf, type resolver } from "./services";

const rootTopic = "wba/app";
const serverPort = await getOpenPort(conf.serverPort);
const serverServiceFile = paths.getAbsolutePath("src/services/service.Server.ts");

export default class WebviewBunApp extends Webviews {
      private onReadyResolver?: resolver;
      private serverService?: InstanceType<typeof Service<"childWorker">>;

      constructor(
            htmlRoot?: string | string[],
            private _port = serverPort,
      ) {
            super(_port, rootTopic);
            this.makeServer(serverServiceFile, htmlRoot)
                  .then(() => this.startApiSocket(socketApi, this))
                  .then(this.apiIsReady)
                  .catch(this.apiIsReady);
      }

      ready = () => {
            return new Promise<typeof this.publicApi>((resolve, reject) => {
                  this.onReadyResolver = { resolve, reject };
            });
      };

      private get publicApi() {
            return {
                  port: this._port,
                  server: this.serverPublicApi,
                  webview: this.webviewPublicApi,
                  publish: this.publish,
                  subscribe: this.subscribe,
                  unsubscribe: this.unsubscribe,
                  request: this.request,
                  once: this.once,
            };
      }

      private webviewPublicApi = {
            create: this.createWebview,
      };
      private serverPublicApi = {
            close: () => {
                  this.serverService?.ipc?.send("end", 0);
            },
            ping: (scope = `${rootTopic}/userSpace`) => {
                  return this.ping(scope);
            },
            setHeader: (name: string, value: string) => {
                  return this.request("wba/server/setHeader", [name, value]);
            },
      };

      private makeServer = (filePath: string, htmlRoot?: string | string[]) => {
            this.serverService = new Service(
                  filePath,
                  "childWorker",
                  serverPort,
                  htmlRoot,
            );
            const { ipc, child } = this.serverService;
            ipc?.listen("ended", () => {
                  logger.info("The server has closed");
                  child.terminate();
            });
            return new Promise((resolve, reject) => {
                  ipc?.listen("ready", () => resolve(true));
                  ipc?.listen("error", (err) => reject(err));
            });
      };

      private apiIsReady = (err?: Error | void) => {
            const userErrString =
                  "The user must instantiate the app with `const wba = new WebviewBunApp(...args).ready(): Promise`";
            if (!this.onReadyResolver) throw Error(userErrString);
            if (err) this.onReadyResolver.reject(err);

            this.subscribe("wba/server/beforeExit", async () => {
                  logger.info("The server is closing...");
                  setTimeout(() => {
                        this.serverService?.ipc?.send("end", 1);
                  });
            });

            return this.onReadyResolver.resolve(this.publicApi);
      };
}

function socketApi(this: InstanceType<typeof WebviewBunApp>) {
      return {};
}

export { SocketInterface, Service, type Topics } from "./services";
