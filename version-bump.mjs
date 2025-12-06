import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const bumpType = process.argv[2] || "patch";

if (!["major", "minor", "patch"].includes(bumpType)) {
    console.error("Usage: node version-bump.mjs [major|minor|patch]");
    process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = packageJson.version.split(".").map(Number);

let newVersion;
if (bumpType === "major") {
    newVersion = `${major + 1}.0.0`;
} else if (bumpType === "minor") {
    newVersion = `${major}.${minor + 1}.0`;
} else {
    newVersion = `${major}.${minor}.${patch + 1}`;
}

// Update package.json
packageJson.version = newVersion;
writeFileSync("package.json", JSON.stringify(packageJson, null, "\t") + "\n");
console.log(`Updated package.json to ${newVersion}`);

// Update manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = newVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
console.log(`Updated manifest.json to ${newVersion}`);

// Update versions.json only if minAppVersion changed
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
const lastMinAppVersion = Object.values(versions).pop();
if (lastMinAppVersion !== minAppVersion) {
    versions[newVersion] = minAppVersion;
    writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
    console.log(`Updated versions.json with ${newVersion}: ${minAppVersion}`);
} else {
    console.log(`Skipped versions.json (minAppVersion unchanged: ${minAppVersion})`);
}

console.log("Updating package-lock.json...");
execSync("npm install", { stdio: "inherit" });

console.log(`\nVersion bumped to ${newVersion}`);
