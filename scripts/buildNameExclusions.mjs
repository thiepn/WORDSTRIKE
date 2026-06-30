import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const SOURCE_SHA256 = "f9aa39846ff5b724e8bc497d3c0d2d5d777ed483c93f5508f8a3bd25e3313018";

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3] || new URL("../data/personalNameExclusions.json", import.meta.url);
  if (!sourcePath) throw new Error("Usage: node scripts/buildNameExclusions.mjs <atleast1000.txt> [output-json]");
  const source = await readFile(sourcePath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== SOURCE_SHA256) throw new Error(`Unexpected SSA-derived source checksum: ${hash}`);
  const names = [...new Set(source.split(/\r?\n/).map((name) => name.trim().toLowerCase())
    .filter((name) => /^[a-z]{2,15}$/.test(name)))].sort();
  const output = {
    schemaVersion: 1,
    source: {
      name: "U.S. Social Security Administration national baby names",
      datasetUrl: "https://catalog.data.gov/dataset/baby-names-from-social-security-card-applications-national-data",
      mirrorUrl: "https://github.com/hackerb9/ssa-baby-names/blob/main/atleast1000.txt",
      license: "CC0-1.0 / U.S. public-domain data",
      retrievalDate: "2026-06-30",
      sourceSha256: SOURCE_SHA256,
      selection: "Names reaching at least 1,000 births in one year; sexes merged by source mirror.",
    },
    names,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${names.length} personal-name exclusions.`);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  await main();
}
