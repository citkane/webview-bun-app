export default {
      //responseTimeout: 500,
      windowRootTopic: "wba/window",
      logLevel: 0,
      webviewDebug: true,
      contentTypes: {
            html: "text/html",
            css: "text/css",
            js: "text/javascript",
            mjs: "text/javascript",
            ts: "text/javascript",
            svg: "image/svg+xml",
      },
      compileFileTypes: ["ts", "mts"],
      serverPort: 0,
      hostname: "localhost",
      socketProtocol: "ws",
      httpProtocol: "http",
};
