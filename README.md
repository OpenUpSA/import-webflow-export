# import-webflow-export

Import a Webflow export repeatably.

If you want to continue editing a site in Webflow and then use the exported site,
you really don't want to edit the exported site manually. Any manual edits will
be overwritten each time you export the site from Webflow again.

You can use this command line tool to import files from standard Webflow
locations to the locations in your project where those files should be.

You can also use this to perform a range of edits on the exported HTML files
programmatically, so that it is repeatable and not overwritten or forgotten.

Use this for example to

- Add a script tag for your javascript that calls an API and manipulates the
  webflow site with the retrieved content
- Adds template tags for server-side templating e.g. in a Django app. This is
  useful for example for meta tags for search engines that don't execute
  javascript.


## Installation

As a dev dependency

    npm install --save-dev import-webflow-export

Or as a global command

    npm install --global import-webflow-export


## Usage

By default, the `css`, `js`, `images`, and `fonts` directories are copied to the same directory names in `src` and `.html` files in all folders are copied to the same directory structure in `src` without any transformations:

    import-webflow webflow-export.zip

You can customise the import by specifying configuration in your `package.json` file under the `importWebflowExport` key.


### copyTrees

Each key is a directory name in the root of the Webflow export.

Each value is a string path where the source directory's contents will be copied to relative to the directory where you run `import-webflow`.

Default:

```json
copyTrees: {
  "css": "src/css",
  "js": "src/js",
  "images": "src/images",
  "fonts": "src/fonts",
}
```


### importHtml

Each item is an object with the keys

- `glob`: a [glob]() to match HTML filenames that will be processed by this item
- `destDir`: the directory relative to the current working directory
- `transforms` (optional): path to a [transformation module](#html-transformation-modules) relative to the current working directory when you run `import-webflow`.

Default:

```json
importHtml: [
  {glob: "*.html", destDir: "src"}
],
```

#### HTML transformation modules

HTML can be transformed programmatically using Javascript transformation modules.
You can perform different transformations on different HTML files by using
different glob pattern items in [importHtml](#importhtml).

The file will be serialised sand saved in the destination directory after
transformation.

Each transformation module must export a function `transform` which receives
arguments

- `window`: a DOM window object
- `$`: a jQuery object initialised on the same window object.

```js
exports.transform = function(window, $) {
  $("title").text("This was modified programmatically!");

  // Adding a script tag to body via jQuery seems to add it to head as well?!
  const tag = window.document.createElement("script");
  tagd.setAttribute("src", "js/index.js");
  window.document.body.appendChild(tag);
};
```