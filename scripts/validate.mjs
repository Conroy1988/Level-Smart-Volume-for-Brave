import { spawnSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const errors = [];

if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
if (Number(manifest.minimum_chrome_version) < 116) {
  errors.push("minimum_chrome_version must support service-worker tab capture (116+)");
}
if (manifest.version !== pkg.version) errors.push("manifest and package versions differ");
if (!manifest.permissions.includes("tabCapture")) errors.push("tabCapture permission is missing");
if (!manifest.permissions.includes("offscreen")) errors.push("offscreen permission is missing");
if (!manifest.content_security_policy?.extension_pages.includes("script-src 'self'")) {
  errors.push("extension CSP must restrict scripts to self");
}

const requiredPaths = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  ...Object.values(manifest.icons)
];
for (const relativePath of requiredPaths) {
  try {
    const info = await stat(path.join(root, relativePath));
    if (!info.isFile()) errors.push(`${relativePath} is not a file`);
  } catch {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

async function collect(directory, extension, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath, extension, files);
    else if (entry.name.endsWith(extension)) files.push(fullPath);
  }
  return files;
}

const javascript = [
  ...(await collect(path.join(root, "src"), ".js")),
  ...(await collect(path.join(root, "scripts"), ".mjs")),
  ...(await collect(path.join(root, "tests"), ".mjs"))
];
for (const file of javascript) {
  const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (checked.status !== 0) {
    errors.push(`${path.relative(root, file)}: ${checked.stderr.trim()}`);
  }
}

const htmlFiles = await collect(path.join(root, "src"), ".html");
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
    errors.push(`${path.relative(root, file)} contains an inline script`);
  }
  if (/\son\w+\s*=/i.test(html)) {
    errors.push(`${path.relative(root, file)} contains an inline event handler`);
  }
}

if (errors.length) {
  console.error(`Level validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Validated Level v${manifest.version}: ${javascript.length} scripts, ${htmlFiles.length} pages, no remote runtime code.`
);
