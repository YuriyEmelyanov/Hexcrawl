import assert from 'node:assert/strict';

export class PackageAbort extends Error {
  constructor(message, options) { super(message, options); this.name = 'PackageAbort'; }
}
export class DeadlineExceeded extends Error {
  constructor(label) { super(`external timeout: ${label}`); this.name = 'DeadlineExceeded'; }
}
export async function deadline(work, label, ms) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new DeadlineExceeded(label)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
export function validateResourceClass(env) {
  assert.equal(env.chromium_version, '151.0.7922.34');
  assert.equal(env.playwright, '1.62.1');
  assert.match(env.node, /^v24\./);
  assert.equal(env.platform, 'linux');
  assert.equal(env.vcpus, 4);
  assert(env.ram_bytes >= 15e9 && env.ram_bytes <= 18e9, 'same standard16GB resource class');
  assert.equal(typeof env.cpu, 'string');
  assert(env.cpu.trim(), 'record actual CPU; exact model is not a resource-class gate');
}
const exited = proc => proc.exitCode !== null || proc.signalCode !== null;
async function confirmExit(proc, ms) {
  if (exited(proc)) return;
  await deadline(() => new Promise((resolve, reject) => {
    const done = () => { proc.off('error', failed); resolve(); };
    const failed = error => { proc.off('exit', done); reject(error); };
    proc.once('exit', done); proc.once('error', failed);
  }), 'owned browser process exit', ms);
  assert(exited(proc), 'owned browser process exit must be observed');
}

// One local BrowserServer owns the process shared by both A/B contexts.
// Timeout always ends this package, even when disposal succeeds. No next row is allowed.
export class BrowserSupervisor {
  constructor({timeoutMs = 180000, cleanupMs = 5000, record = () => {}} = {}) {
    this.timeoutMs = timeoutMs; this.cleanupMs = cleanupMs; this.record = record;
    this.owner = null; this.aborted = false;
  }
  assertActive() { if (this.aborted) throw new PackageAbort('package already aborted; no next action'); }
  async start(chromium) {
    this.assertActive();
    assert.equal(this.owner, null, 'previous browser must have confirmed exit before launch');
    try {
      const server = await chromium.launchServer({headless: true, timeout: 30000, args: ['--no-sandbox', '--disable-dev-shm-usage']});
      this.owner = {server, process: server.process()};
      await this.record({type: 'browser_spawn', pid: this.owner.process.pid});
      const browser = await this.run(() => chromium.connect(server.wsEndpoint(), {timeout: 30000}), 'local browser connection');
      return browser;
    } catch (error) {
      this.aborted = true;
      try { await this.dispose({force: true, reason: 'launch/connect failed'}); }
      catch (cleanupError) { throw new PackageAbort('browser launch/connection and disposal failed', {cause: cleanupError}); }
      throw new PackageAbort('browser launch/connection failed; stop package', {cause: error});
    }
  }
  async run(work, label, ms = this.timeoutMs) {
    this.assertActive();
    try { return await deadline(work, label, ms); }
    catch (error) {
      if (!(error instanceof DeadlineExceeded) && error?.name !== 'TimeoutError') throw error;
      this.aborted = true;
      await this.record({type: 'watchdog_abort', label, error: String(error)});
      try { await this.dispose({force: true, reason: label}); }
      catch (cleanupError) { throw new PackageAbort(`timeout and unconfirmed disposal: ${label}`, {cause: cleanupError}); }
      throw new PackageAbort(`timeout; browser process terminated; remaining rows not_executed: ${label}`, {cause: error});
    }
  }
  async dispose({force = false, reason = 'normal cleanup'} = {}) {
    const owner = this.owner;
    if (!owner) return;
    try {
      if (!force) {
        try { await deadline(() => owner.server.close(), 'graceful browser close', this.cleanupMs); }
        catch (error) { await this.record({type: 'graceful_close_failed', reason, error: String(error)}); force = true; }
      }
      if (force) {
        await this.record({type: 'browser_force_kill', reason, pid: owner.process.pid});
        // BrowserServer.kill kills the owned browser and waits for its process exit.
        await deadline(() => owner.server.kill(), 'force browser kill', this.cleanupMs);
      }
      await confirmExit(owner.process, this.cleanupMs);
      await this.record({type: 'browser_exit_confirmed', reason, pid: owner.process.pid, exitCode: owner.process.exitCode, signalCode: owner.process.signalCode});
      this.owner = null;
    } catch (error) {
      this.aborted = true;
      await this.record({type: 'browser_exit_unconfirmed', reason, pid: owner.process.pid, error: String(error)});
      throw new PackageAbort('owned browser exit unconfirmed; no further actions permitted', {cause: error});
    }
  }
}
