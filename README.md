# isolate-css
CLI utility that isolates styles in css files. That means it modifies css rules so they are applied only inside element with specified class. This is achieved by using nesting functionality of less compiler.
This utility is used in [workbook](https://github.com/FMFI-UK-1-AIN-412/workbook) project to isolate css of *embedded apllications*.

# CLI options

```
isolate-css-cli [options] <file|dir> [[file|dir] ... ]
Options:
      --version         Show version number  [boolean]
  -u, --up              slice a path off the bottom of the paths  [number]
  -e, --extensions      Comma separated list of extensions that should be processed (default: .css)  [string]
  -i, --ignore          Regular expression of paths to ignore  [string]
  -o, --out-dir         Directory where processed files should be saved  [string]
  -c, --create-out-dir  Create output directory if it doesn't exist  [boolean]
  -p, --prefix-class    Used prefix class to isolate css  [string]
  -f, --force           If output file already exists, rewrite it  [boolean]
  -h, --help            Show help  [boolean]
```
