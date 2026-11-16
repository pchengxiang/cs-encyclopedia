import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const api = spawn(process.execPath, ['backend/server.js'], { cwd: root, stdio: 'inherit' })
const web = spawn(npm, ['run', 'dev:web', '--', '--host', '0.0.0.0'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
const stop = () => { api.kill(); web.kill(); process.exit() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
api.on('exit', code => { if (code) { web.kill(); process.exit(code) } })
web.on('exit', code => { if (code) { api.kill(); process.exit(code) } })
