import logger from "./util.logger";

export async function buildJsFileString(
      filePath: string,
      minify: boolean = true,
      sourcemap: "inline" | "none" = "none",
      define = {},
      drop: string[] = [],
      external: string[] = [],
) {
      const result = await Bun.build({
            entrypoints: [filePath],
            minify,
            sourcemap,
            define,
            drop,
            external,
      });
      if (!result.success) {
            logger.error(Error(`Bun failed to build ${filePath}`));
            result.logs.forEach((message) => logger.warning(message));
            return "";
      } else {
            return await result.outputs[0].text();
      }
}
export function stringToJsBlob(string: string) {
      return new Blob([string], { type: "text/javascript" });
}
export function stringToTsBlob(string: string) {
      return new Blob([string], { type: "text/typescript" });
}
export function stringToJsBytes(string: string) {
      return stringToJsBlob(string).bytes();
}
