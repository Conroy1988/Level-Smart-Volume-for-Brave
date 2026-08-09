import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const buildRoot = path.join(root, ".build", "extension");
const dist = path.join(root, "dist");
const archive = path.join(
  dist,
  `level-smart-volume-for-brave-v${manifest.version}.zip`
);

const validation = spawnSync(process.execPath, [path.join(root, "scripts/validate.mjs")], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});
if (validation.status !== 0) process.exit(validation.status || 1);

await rm(path.join(root, ".build"), { recursive: true, force: true });
await mkdir(buildRoot, { recursive: true });
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ["manifest.json", "LICENSE", "src"]) {
  await cp(path.join(root, entry), path.join(buildRoot, entry), { recursive: true });
}
await mkdir(path.join(buildRoot, "assets/icons"), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await cp(
    path.join(root, `assets/icons/icon-${size}.png`),
    path.join(buildRoot, `assets/icons/icon-${size}.png`)
  );
}

const zipped = spawnSync("zip", ["-q", "-r", archive, "."], {
  cwd: buildRoot,
  encoding: "utf8"
});
if (zipped.status !== 0) {
  throw new Error(zipped.stderr || "Could not create Level release archive.");
}

console.log(`Created ${path.relative(root, archive)}`);
