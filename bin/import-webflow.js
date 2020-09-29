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
const load = require('load-plugin');

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
  //module.paths.push(process.cwd());
  console.log(__dirname)

  const tmpDir = tmp.dirSync().name;
  console.log("Extracting to temporary directory", tmpDir);
  await extract(zipfilePath, { dir: tmpDir });
  const packageJson = JSON.parse(fs.readFileSync("package.json", 'utf8'));
  const config = packageJson.importWebflowExport;
  console.log(config && config.importHtml);
  copyTrees(tmpDir, config && config.copyTrees);
  await importHtml(tmpDir, config && config.importHtml);
  console.log("Cleaning up temporary directory", tmpDir);
  rimraf(tmpDir, (err) => { if (err) console.error(err); });

}

function copyTrees(tmpDir, packageConfig) {
  const config = packageConfig || defaults.copyTrees;
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

function importHtml(tmpDir, packageConfig) {
  const config = packageConfig || defaults.importHtml;
  config.forEach((globConfig) => {
    console.log(`Looking for files matching ${globConfig.glob} in ${tmpDir}`);
    glob.sync(`${tmpDir}/${globConfig.glob}`).forEach(async file => {
      await importHtmlFile(file, tmpDir, globConfig.destDir, globConfig.transforms);
    });
  });
};

async function importHtmlFile(filename, tmpDir, destDir, transformsModulePath) {
  const relativePath = filename.slice(tmpDir.length);
  console.log("Reading", filename);
  const inData = fs.readFileSync(filename, 'utf8');
  const dom = parseHtml(inData);
  const $ = jQuery(dom.window);

  await transformHtml($, transformsModulePath);

  const outData = dom.serialize();
  const outFilename = `${destDir}${relativePath}`;
  console.log("Writing", outFilename);
  fs.writeFileSync(outFilename, outData, 'utf8');
}

function parseHtml(html) {
  return new JSDOM(html, {
    // standard options:  disable loading other assets
    // or executing script tags
    FetchExternalResources: false,
    ProcessExternalResources: false,
    MutationEvents: false,
    QuerySelector: false
  });
}

async function transformHtml($, transformsModulePath) {
  if (transformsModulePath === undefined) {
    console.log("No transformation module provided");
  } else {
    console.log("Transforming using", transformsModulePath);
    const mod = await load(transformsModulePath);
    mod.transform($);
  }
}
