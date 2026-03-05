import { rm } from "node:fs/promises";

const directories = ["./dist", "./coverage", "./.nyc_output"];
for (const directory of directories) {
  await rm(directory, { force: true, recursive: true });
  console.log(`Deleted '${directory}' directory`);
}
