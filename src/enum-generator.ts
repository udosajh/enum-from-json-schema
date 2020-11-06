import fs = require("fs");
import path = require("path");

/**
 *
 * @param dirPath get all json files under this dir
 */
export async function getJsonFiles(dirPath: string): Promise<string[]> {
  const jsonFiles: string[] = [];
  try {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const stats = await fs.promises.lstat(dirPath + "/" + file);
      if (stats.isDirectory()) {
        jsonFiles.push(...(await getJsonFiles(dirPath + "/" + file)));
      } else if (file.endsWith(".json")) {
        jsonFiles.push(dirPath + "/" + file);
      }
    }
    return jsonFiles;
  } catch (err) {
    console.error(err);
    return [];
  }
}

/**
 *
 * @param filePath get json object from json path file
 */
export async function getJsonObjectFromJsonFile(filePath: string): Promise<any> {
  return JSON.parse((await fs.promises.readFile(filePath)).toString());
}

/**
 *
 * @param dirPath dir path where json files resides
 * @param outDir dir path where type fill will reside
 */
export async function generateEnumsFromSchema(dirPath: string, outDir: string) {
  try {
    let fileData = "";
    const jsonFiles = await getJsonFiles(dirPath);
    for (const filePath of jsonFiles) {
      const jsonObj = await getJsonObjectFromJsonFile(filePath);
      fileData += findAndGenerateEnum(jsonObj, path.basename(filePath, ".json"));
    }
    if (fileData !== "") {
      await writeEnumFile(fileData, "types.ts", outDir);
    } else {
      console.log("No enum found");
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 *
 * @param jsonObj json object
 * @description find and generate typescript enum from json object if enum attribute exist
 * if enum exist in a separate json file then file name will be used for enum name otherwise
 * if enum is embedded in an object then its property name is used for enum name
 */
export function findAndGenerateEnum(jsonObj: any, name: string) {
  let fileData = "";
  if (jsonObj.type === "object") {
    for (const [property, preopertyVal] of Object.entries(jsonObj.properties)) {
      fileData += findAndGenerateEnum(preopertyVal, property);
    }
  } else {
    if (typeof (jsonObj) === "object" && jsonObj.enum) {
      fileData += getEnumData(jsonObj.enum, name);
    }
  }
  return fileData;
}

/**
 *
 * @param arr array of string which will be converted key,value of enum
 * @param name enum name
 * @returns file output in string
 */
export function getEnumData(arr: string[], name: string) {
  let fileData = "";
  (arr).forEach((element, index) => {
    fileData += "\"" + element + "\"" + " = " + "\"" + element + "\"";
    if (index != arr.length - 1) {
      fileData += ",\n";
    }
  });
  return `export enum ${name} {\n${fileData}\n}\n\n`;
}


/**
 *
 * @param fileData data that is to be written in file
 * @param fileName file name (example => a.ts, b.ts) ts extension should be there
 * @param directoryPath file path (example => /directory)
 */
export async function writeEnumFile(fileData: string, fileName: string, directoryPath: string) {
  await fs.promises.writeFile(directoryPath + "/" + fileName, fileData);
}
