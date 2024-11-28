declare global {
      interface eventTopics {
            "wba/webviews/allClosed": void;
            "wba/server/beforeExit": void;
            "wba/webviews/test": string;
      }
      interface requestTopics extends Topics<typeof rootTopic> {}
}

import {
      type resolver,
      type Topics,
      type Ports,
      getOpenPort,
      logger,
      Service,
      Webviews,
      conf,
      libApi,
} from "./services";
import paths from "./paths";

const [serverHTTP, serverTcp, serviceTcp] = await Promise.all([
      getOpenPort(conf.httpPort),
      getOpenPort(conf.tcpPort),
      getOpenPort(),
]);
const _ports: Ports = { serverHTTP, serverTcp, serviceTcp };

const serverServiceFile = paths.getAbsolutePath("src/services/service.Server.ts");
const rootTopic = "wba/app";

export default class WebviewBunApp extends Webviews {
      private readyResolver?: resolver;
      private serverService?: InstanceType<typeof Service<"childWorker">>;

      constructor(htmlRoot?: string | string[], ports: Ports = _ports) {
            super(ports, libApi.makeTopic(rootTopic));
            this.makeServer(serverServiceFile, htmlRoot)
                  .then(this.serverIsMade)
                  .catch(this.serverIsMade);
      }

      ready = () => {
            return new Promise<typeof this.publicApi>((resolve, reject) => {
                  this.readyResolver = { resolve, reject };
            });
      };

      private get publicApi() {
            const ports: Partial<Ports> = {
                  serverHTTP: this.ports.serverHTTP,
                  serverTcp: this.ports.serverTcp,
            };
            return {
                  ports,
                  server: this.serverPublicApi,
                  webview: this.webviewPublicApi,
                  publish: this.publish,
                  subscribe: this.subscribe,
                  unsubscribe: this.unsubscribe,
                  request: this.request,
                  once: this.once,
                  makeTopic: libApi.makeTopic,
            };
      }

      private webviewPublicApi = {
            create: this.createWebviewInstance,
      };
      private serverPublicApi = {
            close: () => {
                  this.serverService?.ipc?.send("end", 0);
            },
            ping: (scope = `${rootTopic}/userSpace`) => {
                  //return this.ping(scope);
            },
            setHeader: (name: string, value: string) => {
                  //return this.request("wba/server",wba/server/setHeader", [name, value]);
            },
      };

      private makeServer = (filePath: string, htmlRoot?: string | string[]) => {
            const ports = { ...this.ports, ...{ serviceTcp: this.ports.serverTcp } };

            this.serverService = new Service(filePath, "childWorker", ports, htmlRoot);
            const { ipc, child } = this.serverService;
            ipc?.listen("ended", () => {
                  logger.info("The server has closed");
                  this.serverService?.end();
                  this.end();
                  process.exit();
                  //this.serverService?.ipc?.send("end");
                  //child.terminate();
            });
            return new Promise<void>((resolve, reject) => {
                  ipc?.listen("ready", () => resolve());
                  ipc?.listen("error", (err) => reject(err));
            });
      };

      private serverIsMade = async (err?: Error | void) => {
            if (!!err) return logger.error(Error(`${err}`));
            if (!this.readyResolver) throw Error(userErrString);

            await this.apiInit(this, false);

            this.subscribe("wba/server/beforeExit", async () => {
                  logger.info("The server is closing...");
                  setTimeout(() => {
                        this.serverService?.ipc?.send("end", 1);
                        //this.serverService?.terminate();
                        //this.closeSockets();
                  }, 100);
            });

            this.subscribe("wba/webviews/test", (message) => {
                  logger.log(message);
            });

            this.readyResolver!.resolve(this.publicApi);
      };
}

export { SocketInterface, Service, type Topics } from "./services";

const userErrString =
      "The user must instantiate the app with `const wba = new WebviewBunApp(...args).ready(): Promise`";
