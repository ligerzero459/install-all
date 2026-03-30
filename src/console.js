'use strict'

const chalk = require('chalk')
const CLI = require('clui')

class ConsoleUtils {
  constructor(output) {
    this.output = output
  }

  singleLine = (message, color = chalk.white) => {
    const Line = CLI.Line
    new Line(this.output)
      .padding(2)
      .column(message, message.length, [color])
      .fill()
      .output()
  }

  progressLine = (message, progress, current, total) => {
    const Line = CLI.Line
    new Line(this.output)
      .padding(2)
      .column(message, 100, [chalk.yellow])
      .column(`(${current}/${total})`, 10, [chalk.cyan])
      .column(progress.update(current / total), 70)
      .fill()
      .output()
  }
}

module.exports = ConsoleUtils
