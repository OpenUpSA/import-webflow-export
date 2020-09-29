#! /usr/bin/env node

const tmp = require('tmp');
const extract = require('extract-zip');
const ncp = require('ncp').ncp;
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const jQuery = require('jquery');
const fs = require('fs');
const glob = require("glob");
const rimraf = require("rimraf");

const defaults = {
  copyTrees: {
    "css": "src/css",
    "js": "src/js",
    "images": "src/images",
    "fonts": "src/fonts",
  },
  importHtml: [
    {glob: "*.html", destDir: "src"}
  ],
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
  const tmpDir = tmp.dirSync().name;
  console.log("Extracting to temporary directory", tmpDir);
  await extract(zipfilePath, { dir: tmpDir });
  copyTrees(tmpDir);
  importHtml(tmpDir);
  console.log("Cleaning up temporary directory", tmpDir);
  rimraf(tmpDir, (err) => { if (err) console.error(err); });

}

function copyTrees(tmpDir) {
  for (let sourceDir in defaults.copyTrees) {
    const destDir = defaults.copyTrees[sourceDir];
    console.log("Copying", sourceDir, "to", destDir);
    ncp(`${tmpDir}/${sourceDir}`, destDir, { stopOnError: true }, ncpCallback);
  }
}

function ncpCallback(err) {
  if (err)
    console.error(err);
}

function importHtml(tmpDir) {
  defaults.importHtml.forEach((config) => {
    console.log(`Looking for files matching ${config.glob} in ${tmpDir}`);
    glob.sync(`${tmpDir}/${config.glob}`).forEach(file => {
      importHtmlFile(file, tmpDir, config.destDir);
    });
  });
};

function importHtmlFile(filename, tmpDir, destDir) {
  const relativePath = filename.slice(tmpDir.length);
  console.log("Reading", filename);
  const inData = fs.readFileSync(filename, 'utf8');

  const dom = new JSDOM(inData, {
    // standard options:  disable loading other assets
    // or executing script tags
    FetchExternalResources: false,
    ProcessExternalResources: false,
    MutationEvents: false,
    QuerySelector: false
  });

  const $ = jQuery(dom.window);

  const outData = dom.serialize();

  const outFilename = `${destDir}${relativePath}`;
  console.log("Writing", outFilename);
  fs.writeFileSync(outFilename, outData, 'utf8');
}
