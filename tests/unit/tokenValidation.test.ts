import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

// Helper to run the server as a child process
function runServer(env: Record<string, string>): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Determine the path to src/index.ts
    const indexFile = path.resolve(__dirname, '../../src/index.ts');

    // Spawn tsx to run the TypeScript file
    const child = spawn('npx', ['tsx', indexFile], {
      env: { ...process.env, ...env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    // Fallback: If it doesn't close quickly (e.g. valid startup waits on stdin),
    // kill it after 1.5 seconds.
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
      }
    }, 1500);
  });
}

describe('FR-010: TOKEN_SERVICE Validation', () => {
  it('should exit with error if TOKEN_SERVICE is missing', async () => {
    // Remove TOKEN_SERVICE by passing a clean env object or explicit undefined (using any to bypass strict type check on spawn)
    const env: any = { VALUERAY_BASE_URL: 'https://test.com' };
    delete env.TOKEN_SERVICE;

    const result = await runServer(env);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('ERROR: TOKEN_SERVICE environment variable is required');
  });

  it('should exit with error if TOKEN_SERVICE is empty', async () => {
    const env = { VALUERAY_BASE_URL: 'https://test.com', TOKEN_SERVICE: '   ' };

    const result = await runServer(env);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('ERROR: TOKEN_SERVICE environment variable is required');
  });

  it('should start successfully if TOKEN_SERVICE is present', async () => {
    const env = { VALUERAY_BASE_URL: 'https://test.com', TOKEN_SERVICE: 'valid-token' };

    const result = await runServer(env);
    
    // Process killed by timeout = null code, or might be 0 if clean exit
    // But stderr should contain the startup message
    expect(result.stderr).toContain('Valueray MCP Server started');
    // Ensure the validation error is NOT present
    expect(result.stderr).not.toContain('ERROR: TOKEN_SERVICE');
  });
});
