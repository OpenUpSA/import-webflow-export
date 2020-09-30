#! /usr/bin/env node

const tmp = require('tmp');
const extract = require('extract-zip');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const jQuery = require('jquery');
const fs = require('fs-extra');
const glob = require("glob");
const load = require('load-plugin');
const path = require('path');

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

  const tmpDir = tmp.dirSync().name;
  console.log("Extracting to temporary directory", tmpDir);
  await extract(zipfilePath, { dir: tmpDir });
  const packageJson = JSON.parse(fs.readFileSync("package.json", 'utf8'));
  const config = packageJson.importWebflowExport;
  copyTrees(tmpDir, config && config.copyTrees);
  await importHtml(tmpDir, config && config.importHtml);
  console.log("Cleaning up temporary directory", tmpDir);
  fs.removeSync(tmpDir);

}

function copyTrees(tmpDir, packageConfig) {
  const config = packageConfig || defaults.copyTrees;
  for (let sourceDir in config) {
    const destDir = config[sourceDir];
    console.log("Copying", sourceDir, "to", destDir);
    fs.copySync(`${tmpDir}/${sourceDir}`, destDir);
  }
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
  let newHtml = inData;

  if (transformsModulePath === undefined) {
    console.log("No DOM transformation provided");
  } else {
    console.log("Transforming using", transformsModulePath);
    const mod = await load(transformsModulePath);

    const domTransform = mod.transformDOM || mod.transform;
    if (domTransform)
      newHtml = transformDOM(domTransform, newHtml);

    if (mod.transformHTML)
      newHtml = mod.transformHTML(newHtml);
  }

  const outFilename = `${destDir}${relativePath}`;
  const outDir = path.dirname(outFilename);
  fs.mkdirpSync(outDir);
  console.log("Writing", outFilename);
  fs.writeFileSync(outFilename, newHtml, 'utf8');
}

function transformDOM(transformFunction, html) {
  const dom = new JSDOM(html);
  const $ = jQuery(dom.window);
  transformFunction(dom.window, $);
  return dom.serialize();
}
