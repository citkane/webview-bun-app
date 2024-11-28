type compileFileKey = keyof typeof compileFilePairs;
type mimeKey = keyof typeof mimePairs;

import mimePairs from "./services/lib/lib.mimeTypes.json";
import compileFilePairs from "./services/lib/lib.compileFileTypes.json";

const config = {
      //responseTimeout: 500,
      //keepAliveTimeout: 1000,
      logLevel: 0,
      webviewDebug: true,
      mimePairs,
      compileFilePairs,
      httpPort: 0,
      tcpPort: 0,
      hostname: "localhost",
      socketProtocol: "ws",
      httpProtocol: "http",
};

Object.keys(config.compileFilePairs).forEach((key) => {
      const mimeKey = config.compileFilePairs[key as compileFileKey];
      const mimeValue = config.mimePairs[mimeKey as mimeKey];
      config.mimePairs[key as mimeKey] = mimeValue;
});

export default config;
