import { spawn } from 'node:child_process';

export function hasTool(tool: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(tool, ['-version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

export function runTool(tool: string, args: string[], input?: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(
          stdout
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        );
      } else {
        reject(new Error(`${tool} exited with code ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}
