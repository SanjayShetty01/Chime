import { Command, Child } from "@tauri-apps/plugin-shell";

let backendProcess: Child | null = null;

export const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

export async function startBackendSidecar() {
  if (!isTauri) {
    return;
  }

  if (backendProcess) {
    return;
  }

  try {
    const command = Command.sidecar("binaries/chime-backend");

    command.stdout.on("data", (line: string) => {
      console.log("[sidecar stdout]", line);
    });

    command.stderr.on("data", (line: string) => {
      console.warn("[sidecar stderr]", line);
    });

    command.on("close", (data) => {
      console.log(`[sidecar] process closed with code ${data.code}`);
      backendProcess = null;
    });

    command.on("error", (error) => {
      console.error("[sidecar] process error:", error);
    });

    backendProcess = await command.spawn();
    console.log("[sidecar] spawned backend PID:", backendProcess.pid);
  } catch (err) {
    console.error("[sidecar] failed to spawn backend:", err);
  }
}

export async function stopBackendSidecar() {
  if (backendProcess) {
    try {
      await backendProcess.kill();
      console.log("[sidecar] backend stopped");
    } catch (err) {
      console.error("[sidecar] failed to kill process:", err);
    } finally {
      backendProcess = null;
    }
  }
}
