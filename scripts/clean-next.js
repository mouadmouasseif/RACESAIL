const fs = require("fs");
const path = require("path");

const folders = [".next", "node_modules/.cache"];

for (const folder of folders) {
  const target = path.join(process.cwd(), folder);

  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Deleted ${folder}`);
  }
}

console.log("Next.js cache cleaned successfully.");
