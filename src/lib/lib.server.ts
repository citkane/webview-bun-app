import type { topic } from "../types/types.messaging";
type fileMeta = Exclude<ReturnType<typeof parseFilePath>, Response>;

import conf from "../conf";
import { buildJsFileString, statusCode, stringToJsBytes } from "../utils";
import * as path from "node:path";
import { existsSync } from "node:fs";

export function getFileMeta(
      req: Request,
      htmlRoots: string[],
      headers: Headers,
): Promise<fileMeta> {
      const fileMeta = parseFilePath(new URL(req.url).pathname);
      const searchLocations = htmlRoots.map((dir) => path.join(dir, fileMeta.filePath));
      fileMeta.filePath = searchLocations.find((filePath) => existsSync(filePath))!;
      return new Promise<fileMeta>((respond, reject) => {
            !!fileMeta.filePath
                  ? respond(fileMeta)
                  : reject(serverError(statusCode.NotFound, headers));
      });
}
export function makeResponse(metaOrError: fileMeta, headers: Headers) {
      const { filePath, fileType } = metaOrError as fileMeta;
      console.log({ filePath, fileType });
      const errorCode = setContentType(fileType, headers);
      return new Promise<Response>(async (resolve, reject) => {
            if (errorCode) return reject(serverError(errorCode, headers));

            const file = await fetchFile(filePath, fileType);
            resolve(new Response(file, { headers }));
      });
}

export function setContentType(fileType: string, headers: Headers) {
      const k = fileType as keyof typeof conf.contentTypes;
      const contentType = conf.contentTypes[k];
      console.log({ fileType, contentType });
      return !!contentType
            ? headers.set("Content-Type", contentType)
            : statusCode.NotImplemented;
}
export function serverError(code: statusCode, headers: Headers) {
      return new Response("", {
            status: code,
            headers,
      });
}
export function parseFilePath(filePath: string) {
      const pathArray = filePath.split(".");
      if (pathArray.length === 1) {
            filePath = `${filePath}index.html`;
            pathArray.push("html");
      }
      const fileType = pathArray[pathArray.length - 1];
      return { filePath, fileType };
}
export function fetchFile(filePath: string, fileType: string) {
      const compileTheFile = conf.compileFileTypes.includes(fileType);
      return compileTheFile
            ? buildJsFileString(filePath).then(stringToJsBytes)
            : Bun.file(filePath).bytes();
}
