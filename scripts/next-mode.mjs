import { spawn } from "node:child_process";
import { join } from "node:path";

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const [command, mode] = process.argv.slice(2);

if (!command || !mode) {
  process.stderr.write("Comando inválido. Utilize dev/local, build/cloud ou start/cloud.\n");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, command], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_DATA_MODE: mode,
    INDUSTRIALTECH_DATA_MODE: mode
  }
});

child.on("exit", code => process.exit(code ?? 1));
