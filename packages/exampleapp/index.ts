import WebviewBunApp, { type Topics, Service } from "webview-bun-app";

const wba = await new WebviewBunApp().ready();
const pong = await wba.server.ping();
console.log(pong);

/** Create a service for your backend business logic
 */

/*
const filePath = "path/to/your/BackendService.ts";
const backendService = new Service(filePath, "childProcess", [
      wba.port,
      ...["serviceParameters"],
]);
*/

/** Create webview instances.
 *  Each will be running in it's own process (not a worker thread)
 */
const webview1 = await wba.webview.create("window/1");
const webview2 = await wba.webview.create("window/2");

/** In this example, we want to shut down the whole application if webview1 is closed
 */
webview1.onclose(wba.server.close);

/** Set up your webviews
 */
webview1.navigate(/* your absolute html root dir path*/);
webview1.title("webview 1");
webview2.navigate(/* your absolute html root dir path*/);
webview2.title("webview 2");

/** Wait for the signal from your backend service before running the webviews
 */
/*
backendService.ipc?.listen("ready", () => {
      webview1.run();
      webview2.run();
});
*/
webview1.run();
webview2.run();
/** Perform custom logic before the common interface server closes,
 *  ie. your application is shutting down.
 */
wba.subscribe("wba/server/beforeExit", () => {
      webview2.terminate();
      //backendService.terminate();
});

//wba.subscribe("", () => {});
