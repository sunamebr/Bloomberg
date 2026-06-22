import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export class ProcessLock {
  private lockPath: string;

  constructor(stateDir: string) {
    this.lockPath = join(stateDir, "engine.pid");
  }

  acquire(): boolean {
    if (existsSync(this.lockPath)) {
      const pid = Number(readFileSync(this.lockPath, "utf-8"));
      try {
        process.kill(pid, 0);
        return false;
      } catch {
        unlinkSync(this.lockPath);
      }
    }
    writeFileSync(this.lockPath, String(process.pid));
    return true;
  }

  release(): void {
    if (existsSync(this.lockPath)) {
      unlinkSync(this.lockPath);
    }
  }
}
