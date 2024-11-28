import { Webview } from "webview-bun-lib";
import {
      conf,
      makeHttpUrl,
      paths,
      buildJsFileString,
      libApi,
      type Ports,
      factoryDebug,
      SocketServer,
      logger,
} from ".";

const serviceFilePath = paths.getAbsolutePath("src/services/service.Window.ts");
const windowJS = await buildJsFileString(serviceFilePath);
const webview = new Webview(conf.webviewDebug);
let debug: ReturnType<typeof factoryDebug>["webview"];

export class Main extends SocketServer {
      id = webview.id;

      constructor(ports: Ports, rootTopic: string) {
            super(ports, libApi.makeTopic(rootTopic), process);

            debug = factoryDebug.bind(this)(__filename).webview;

            this.apiInit(this, requestApi).then(() => {
                  libApi.loggerKeys.forEach((key) => {
                        const k = key as keyof typeof logger;
                        webview.bind(`wba_logger_${k}`, logger[k]);
                  });
                  libApi.apiKeys.forEach((key) => {
                        const k = key as keyof Partial<InstanceType<typeof Main>>;
                        webview.bind(`wba_${k}`, (this as any)[k]);
                  });
                  webview.init(windowJS);
                  this.apiInternal?.navigate();

                  this.ipc?.send("ready", this.id);
            });
      }
}

function requestApi(this: InstanceType<typeof Main>) {
      return {
            navigate: (url: URL = makeHttpUrl(this.ports.serverHTTP)) => {
                  return webview.navigate(url.toString());
            },
            run: () => {
                  debug.run();
                  webview.run();

                  this.ipc?.send("ended", this.id);
                  this.end();
            },
            setTitle: (title: string) => {
                  return webview.setTitle(title);
            },
            bind: webview.bind,
            unbind: webview.unbind,
      };
}
