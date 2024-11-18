import * as path from "node:path";

const currentFilePath = import.meta.path;
const currentFileDir = path.dirname(currentFilePath);

/**
 * The `src` directory of this module
 */
const src = path.resolve(currentFileDir);

/**
 * The absolute module root directory
 */
const root = path.join(src, "../");

/**
 * @param relative A path relative to this module root directory
 * @returns The absolute path of the given relative paramater
 */
const getAbsolutePath = (relative: string) => path.join(root, relative);

export default {
      src,
      root,
      getAbsolutePath,
};
