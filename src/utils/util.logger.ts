import conf from "../conf";

const level = conf.logLevel;
export default {
      debug: (message: any) => (level < 1 ? () => console.debug(message) : null),
      info: (message: any) => (level < 2 ? console.info(message) : null),
      log: (message: any) => (level < 3 ? console.log(message) : null),
      warning: (warning: any) => (level < 4 ? console.debug(warning) : null),
      error: (err: Error) => console.error(err),
};
