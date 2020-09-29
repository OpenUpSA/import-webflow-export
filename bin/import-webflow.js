#! /usr/bin/env node

const tmp = require('tmp');
const extract = require('extract-zip');
const argv = require('yargs')
      .usage('$0 <cmd> [args]')
      .command('$0 webflow-export-zipfile', 'Import Webflow exports repeatably.', (yargs) => {
        yargs.positional('webflow-export-zipfile', {
          type: 'string',
          describe: 'The path to the Webflow export zipfile'
        });
      }, (argv) => importZipfile(argv.webflowExportZipfile))
      .help()
      .argv;

function importZipfile(zipfilePath) {
  const tmpDir = tmp.dirSync();
  extract(zipfilePath, { dir: tmpDir.name });
}
