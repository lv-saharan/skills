/**
 * Browser Process Manager
 *
 * @module core/browser/launcher/process-manager
 * @description Browser process lifecycle management
 */

// ============================================
// Process Termination
// ============================================

/**
 * Force kill a process by PID
 *
 * @param pid - Process ID to kill
 * @returns True if process was killed successfully
 */
export async function forceKillProcess(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      await promisify(exec)(`taskkill /F /T /PID ${pid}`);
    } else {
      process.kill(pid, 'SIGKILL');
    }

    // Wait for process to terminate
    await waitForProcessExit(pid, 5000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a process is running
 *
 * @param pid - Process ID
 * @returns True if process is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for process to exit
 *
 * @param pid - Process ID to wait for
 * @param timeout - Timeout in milliseconds
 * @returns True if process exited
 */
export async function waitForProcessExit(pid: number, timeout: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!isProcessRunning(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
