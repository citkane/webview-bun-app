import mimeTypes from "./services/lib/lib.mimeTypes.json";

export default {
      //responseTimeout: 500,
      windowRootTopic: "wba/window",
      logLevel: 0,
      webviewDebug: true,
      mimeTypes,
      compileFileTypes: ["ts", "mts"],
      serverPort: 0,
      hostname: "localhost",
      socketProtocol: "ws",
      httpProtocol: "http",
};
