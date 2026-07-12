import fs from "fs";
import path from "path";

let cached: string | null = null;

export function getNavbarHtml(): string {
  if (cached === null) {
    cached = fs.readFileSync(path.join(process.cwd(), "lib", "server", "navbar.html"), "utf8");
  }
  return cached;
}
