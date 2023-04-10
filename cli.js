#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import fs from 'fs';
import { readdir } from 'fs/promises';
import crypto from 'crypto';
import { isolateCss } from './isolateCss.js'

function die(msg) {
    throw Error(msg);
}

function defaultPrefixClass() {
    const pkg = JSON.parse(fs.readFileSync('./package.json', {encoding:'utf8'}));
    const appName = pkg.name.replace(/[^_a-zA-Z0-9-]/g, '');
    const c = crypto.createHash('sha256');
    c.update(appName);
    const salt = c.digest('base64').slice(0,10);
    return `prefix-${appName}-${salt}`;
}

function nameAndExt(filename) {
    const {name, dir, ext} = path.parse(filename);
    return {name: path.join(dir, name), ext};
}

function createDirsForFile(filepath) {
    const { dir } = path.parse(filepath);
    fs.mkdirSync(dir, { recursive: true });
}

async function traverse(dir, callback) {
    const files = await readdir( dir, {withFileTypes: true});
    for (const f of files) {
        if (f.isFile()) {
            await callback(path.join(dir, f.name));
        }
        if (f.isDirectory()) {
            await traverse(path.join(dir, f.name), callback);
        }
    }
}

async function processFile(filepath, prefixClass, outDir, up, extensions, ignore, force, removeSourceMaps) {
    const { name, ext } = nameAndExt(filepath);
    if (!extensions.find(e => e === ext)) {
        return false;
    }
    if (ignore && filepath.match(ignore) !== null) {
        return false;
    }

    let outFile = `${name}.iso${ext}`;
    if (outDir) {
        let p = path.normalize(path.relative(process.cwd(), outFile)).split(path.sep);
        if (up >= p.length) {
            die('Number given in --up parameter is too high');
        }
        p = p.slice(up);
        outFile = path.join(outDir, ...p);
        createDirsForFile(outFile);
    }

    if (!force && fs.existsSync(outFile)) {
        die(`Output for css file: '${outFile}' already exists`);
    }
    console.log(`Isolate CSS: ${filepath} -> ${outFile}`);
    return isolateCss(filepath, prefixClass, removeSourceMaps, outFile);
}

async function processDir(dir, prefixClass, outDir, up, extensions, ignore, force, removeSourceMaps) {
    await traverse(dir, async (path) => {
        await processFile(path, prefixClass, outDir, up, extensions, ignore, force, removeSourceMaps);
    });
}

const argv = yargs(hideBin(process.argv))
  .option('up', {
    alias: 'u',
    description: 'slice a path off the bottom of the paths',
    type: 'number',
  })
  .option('extensions', {
    alias: 'e',
    description: 'Comma separated list of extensions that should be processed (default: .css)',
    type: 'string',
  })
  .option('ignore', {
    alias: 'i',
    description: 'Regular expression of paths to ignore',
    type: 'string'
  })
  .option('out-dir', {
    alias: 'o',
    description: 'Directory where processed files should be saved',
    type: 'string'
  })
  .option('create-out-dir', {
    alias: 'c',
    description: 'Create output directory if it doesn\'t exist',
    type: 'boolean',
    nargs: 0,
  })
  .option('prefix-class', {
    alias: 'p',
    description: 'Used prefix class to isolate css',
    type: 'string'
  })
  .option('force', {
    alias: 'f',
    description: 'If output file already exists, rewrite it',
    type: 'boolean',
    nargs: 0,
  })
  .option('remove-source-maps', {
    alias: 'r',
    description: 'Remove source map references in output css',
    type: 'boolean',
    nargs: 0,
    default: false,
  })
  .help()
  .alias('help', 'h')
  .wrap(yargs.terminalWidth)
  .parse();

//console.log(argv);

const extensions = argv.extensions ? argv.extensions.split(',') : ['.css'];
const ignore = argv.ignore ? new RegExp(argv.ignore) : undefined;
const outDir = argv.outDir;
const up = argv.up || 0;
const prefixClass = argv.prefixClass || await defaultPrefixClass();
const { createOutDir, force, removeSourceMaps } = argv;

/* pre-checks */
if (outDir) {
    if (createOutDir) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    const stat = fs.statSync(outDir);
    if (!stat.isDirectory()) {
        die('Specified output directory is not directory');
    }
}

if (argv.up && !outDir) {
    die('--up option cannot be used without --out-dir');
}

if (up < 0) {
    die('Number fiven in --up option cannot be negative');
}

for (const f of argv._) {
    const stats = fs.statSync(f)

    if (!(stats.isFile() || stats.isDirectory())) {
        die(`Input path ${f} is neither file nor directory`);
    }

    if (path.normalize(path.relative(process.cwd(), f)).split(path.sep)[0] === '..') {
        die('Files to process must not be outside current working directory');
    }

    const segl = path.normalize(path.relative(process.cwd(), f)).split(path.sep).length;
    if (stats.isFile() && segl <= up) {
        die('Number given in --up parameter is too high');
    } else if (stats.isDirectory() && segl < up) {
        die('Number given in --up parameter is too high');
    }
}

if (argv._.length === 0) {
    die('No input files specified');
}

/* process files */
for (const f of argv._) {
    fs.stat(f, async (err, stats) => {
        if (err) {
            die(err);
        } else {
            if (stats.isFile()) {
                console.log('processing file ' + f);
                await processFile(f, prefixClass, outDir, up, extensions, ignore, force, removeSourceMaps);
            } else if (stats.isDirectory()) {
                console.log('processing directory ' + f);
                await processDir(f, prefixClass, outDir, up, extensions, ignore, force, removeSourceMaps);
            }
        }
    })
}
