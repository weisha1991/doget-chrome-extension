const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const EXT_NAME = "doget-extension";

const FILES_TO_COPY = [
  "manifest.json",
  "LICENSE",
  { src: "src/background.js", dest: "src/background.js" },
  { src: "src/popup.html", dest: "src/popup.html" },
  { src: "src/popup.css", dest: "src/popup.css" },
  { src: "src/popup.js", dest: "src/popup.js" },
  { src: "src/content.js", dest: "src/content.js" },
  { src: "src/content.css", dest: "src/content.css" },
  { src: "icons", dest: "icons" },
  { src: "_locales", dest: "_locales" },
];

const destDir = path.join(DIST, EXT_NAME);

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true });
}

fs.mkdirSync(destDir, { recursive: true });
fs.mkdirSync(path.join(destDir, "src"), { recursive: true });

for (const item of FILES_TO_COPY) {
  if (typeof item === "string") {
    const src = path.join(ROOT, item);
    const dst = path.join(destDir, item);
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  } else {
    const src = path.join(ROOT, item.src);
    const dst = path.join(destDir, item.dest);
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dst);
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }
}

console.log(`Build complete: ${destDir}`);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
