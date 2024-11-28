import WebviewBunApp, { type Topics, Service } from "webview-bun-app";

const wba = await new WebviewBunApp().ready();

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
const webview1 = await wba.webview.create(wba.makeTopic("window/1"));
const webview2 = await wba.webview.create(wba.makeTopic("window/2"));

/** In this example, we want to shut down the whole application if webview1 is closed
 */
webview1.onclose((service) => wba.server.close()); //wba.server.close);

/** Set up your webviews
 */
webview1.setTitle("webview 1");
webview2.setTitle("webview 2");

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
      webview2.close();
      //backendService.terminate();
});
wba.publish("wba/webviews/test", "A test message from the near side");

//wba.subscribe("", () => {});
