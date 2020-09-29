#! /usr/bin/env node

const tmp = require('tmp');
const extract = require('extract-zip');
const ncp = require('ncp').ncp;

const copyTrees = {
  "css": "src/css",
  "js": "src/js",
  "images": "src/images",
  "fonts": "src/fonts",
};

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

async function importZipfile(zipfilePath) {
  const tmpDir = tmp.dirSync();
  await extract(zipfilePath, { dir: tmpDir.name });

  for (let sourceDir in copyTrees) {
    const destDir = copyTrees[sourceDir];
    ncp(`${tmpDir.name}/${sourceDir}`, destDir, { stopOnError: true }, ncpCallback);
  }
}

function ncpCallback(err) {
  if (err)
    console.error(err);
}
