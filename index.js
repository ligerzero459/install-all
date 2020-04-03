#!/usr/local/bin/node

'use strict'

const chalk = require('chalk')
const CLI = require('clui')
const exec = require('child_process').exec
const figlet = require('figlet')
const fs = require('fs')
const path = require('path')
const async = require('async')

const Spinner = CLI.Spinner
const Progress = CLI.Progress

const progress_bar = new Progress(50)

const count = {
  current: 0
, total: 0
, installed: 0
}

console.log(
  chalk.blue(
    figlet.textSync('install-all')
  )
)

function runInstall(dir, cb) {
  exec('npm install', { cwd: path.join('.', dir) }, (err, stdout, stderr) => {
    if (err) {
      return cb(err)
    }

    // Update counts and update progress bar
    count.installed++
    count.current++
    console.log(
      chalk.yellowBright(dir), progress_bar.update(count.current, count.total)
    )

    cb()
  })
}

function checkDirForPackage(dir, cb) {
  const workingDir = path.join('.', dir)
  if (!fs.lstatSync(workingDir).isDirectory()) {
    return cb()
  }

  fs.readdir(workingDir, (err, files) => {
    if (err) return cb(err)

    if (!files.includes('package.json')) {
      count.current++
      progress_bar.update(count.current, count.total)
      return cb()
    }
    runInstall(dir, cb)
  })
}

function readDirs(cb) {
  fs.readdir('.', (err, files) => {
    if (err) throw err
    count.total = files.length
    async.eachLimit(files, 4, checkDirForPackage, (err) => {
      if (err) throw err

      cb()
    })
  })
}

readDirs(() => {
  console.log(
    chalk.green(
      '\nPackage install complete' +
      `\n${count.installed} package installations performed.`
    )
  )
})
