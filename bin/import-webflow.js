#! /usr/bin/env node

const tmp = require('tmp');
const extract = require('extract-zip');
const ncp = require('ncp').ncp;
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const jQuery = require('jquery');
const fs = require('fs');
const glob = require("glob");

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
  await extract(zipfilePath, { dir: tmpDir });
  copyTrees(tmpDir);
  importHtml(tmpDir);
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
  console.log("Done.");
}

function importHtml(tmpDir) {
  defaults.importHtml.forEach((config) => {
    console.log(`Looking for files matching ${config.glob} in ${tmpDir}`);
    glob(`${tmpDir}/${config.glob}`, function (er, files) {
      files.forEach(file => {
        importHtmlFile(file, tmpDir, config.destDir);
      });
    });
  });
};

function importHtmlFile(filename, tmpDir, destDir) {
  const relativePath = filename.slice(tmpDir.length);
  console.log("Reading", filename);
  fs.readFile(filename, 'utf8', function(err, inData) {
    if (err)
      return console.error(err);

    const window = new JSDOM(inData, {
      // standard options:  disable loading other assets
      // or executing script tags
      FetchExternalResources: false,
      ProcessExternalResources: false,
      MutationEvents: false,
      QuerySelector: false
    }).window;
    const windowJQuery = jQuery.create(window);

    const outData = window.document.doctype + window.document.innerHTML;

    const outFilename = `${destDir}/${relativePath}`;
    console.log("Writing", outFilename);
    fs.writeFile(outFilename, outData, 'utf8', function(err) {
      if (err)
        console.error(err);
    });
  });
}
