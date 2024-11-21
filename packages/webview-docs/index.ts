import { join, dirname } from "node:path";
import WebviewBunApp from "webview-bun-app";

const htmlDir = join(dirname(require.resolve("webview-bun-lib")), "../docs/html");

const wba = await new WebviewBunApp(htmlDir).ready();
const webview = await wba.webview.create("webview/documentation");

webview.setTitle("libWebview documentation");
webview.onclose(wba.server.close);
webview.run();
