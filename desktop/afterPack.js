// Embeds the app icon and version info into the packaged exe with rcedit (electron-builder's own step needs symlink privileges on Windows).
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const v = context.packager.appInfo.version;
  execFileSync(path.join(__dirname, "tools", "rcedit-x64.exe"), [
    exe, "--set-icon", path.join(__dirname, "assets", "icon.ico"),
    "--set-version-string", "ProductName", "RealityLab AI", "--set-version-string", "FileDescription", "RealityLab AI",
    "--set-version-string", "CompanyName", "RealityLab AI", "--set-version-string", "LegalCopyright", "RealityLab AI",
    "--set-file-version", v, "--set-product-version", v,
  ], { stdio: "inherit" });
};
