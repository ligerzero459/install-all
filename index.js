#!/usr/bin/env node

/****
 *   _           _        _ _             _ _
 *  (_)_ __  ___| |_ __ _| | |       __ _| | |
 *  | | '_ \/ __| __/ _` | | |_____ / _` | | |
 *  | | | | \__ \ || (_| | | |_____| (_| | | |
 *  |_|_| |_|___/\__\__,_|_|_|      \__,_|_|_|
 ****/

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const chalk = require('chalk')
const CLI = require('clui')
const figlet = require('figlet')
const async = require('async')

const ConsoleUtils = require('./src/console')
const { findPackageDirs } = require('./src/directory')
const { runInstall, determinePackageManager } = require('./src/install')

const LineBuffer = CLI.LineBuffer
const Progress = CLI.Progress
const output = new LineBuffer({
  x: 0
, y: 0
, width: 'console'
, height: 'console'
})
const progressBar = new Progress(50)

const { singleLine, progressLine } = new ConsoleUtils(output)

const count = {
  current: 0
, total: 0
, installed: 0
, failed: 0
, errors: []
}

async function start() {
  try {
    console.log(
      chalk.blue(
        figlet.textSync('install-all')
      )
    )
  } catch (err) {
    singleLine('install-all', chalk.blue)
  }

  const installDirs = findPackageDirs()
  count.total = installDirs.length

  singleLine('Starting package installation...', chalk.green)
  singleLine(`Found ${count.total} package directories to install.`, chalk.green)

  await async.eachLimit(installDirs, 5, async (dir) => {
    // Determine package manager to use based on lock files
    const pm = determinePackageManager(dir)
    count.current++

    // Shorten the displayed path if it's too long to avoid breaking the progress bar layout
    const displayDir = dir.length > 53 ? dir.slice(0, 50) + '...' : dir
    progressLine(`Installing packages in ${displayDir} with ${pm}...`, progressBar, count.installed, count.total)

    // Install packages and update counts based on success/failure
    // Technically this is race-y since multiple installs are happening concurrently, but the progress bar is
    // just an estimate anyway and this keeps the code simpler than trying to coordinate counts across async workers
    const result = await runInstall(dir, pm)
    if (result.success) {
      count.installed++
    } else {
      count.failed++
      count.errors.push({ dir, pm, error: result.error })
    }
  })

  singleLine('Package installation complete.', chalk.green)
  singleLine(`${count.installed}/${count.total} package installations performed successfully.`, chalk.green)

  if (count.errors.length > 0) {
    // Log errors to a file in home directory with a timestamp
    const timestamp = new Date().toISOString()
    const safeTimestamp = timestamp.replace(/:/g, '-')
    const logPath = path.join(os.homedir(), `install-all-failures-${safeTimestamp}.log`)
    const lines = [`[${timestamp}] ${count.failed} failed installation(s):\n`]
    for (const { dir, pm, error } of count.errors) {
      lines.push(`  Directory: ${dir}`)
      lines.push(`  Package manager: ${pm}`)
      lines.push(`  Error: ${error}\n`)
    }
    fs.writeFileSync(logPath, lines.join('\n') + '\n')
    singleLine(`${count.failed} failure(s) logged to ${logPath}`, chalk.red)
    process.exit(1)
  }
}

start().catch(err => {
  console.error(chalk.red('Error during installation:'), err)
  process.exit(1)
})
