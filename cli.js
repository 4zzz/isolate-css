#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { isolateCss } from './isolateCss.js'

function die(msg) {
    throw Error(msg);
}

function defaultPrefixClass() {
    const pkg = JSON.parse(fs.readFileSync('./package.json', {encoding:'utf8'}));
    const appName = pkg.name;
    const c = crypto.createHash('sha256');
    c.update(appName);
    const salt = c.digest('base64').slice(0,10);
    return `${appName}-${salt}`;
}

function nameAndExt(filename) {
    const {name, dir, ext} = path.parse(filename);
    return {name: path.join(dir, name), ext};
}

function createDirsForFile(filepath) {
    const { dir } = path.parse(filepath);
    fs.mkdirSync(dir, { recursive: true });
}

function traverse(dir, callback, cPathArr = []) {
    cPathArr.push(dir);
    const cPath = path.join(...cPathArr);
    fs.readdir( dir, {withFileTypes: true}, async (err, files) => {
        if (err) {
            die(err);
        } else {
            for (const f of files) {
                if (f.isFile()) {
                    await callback(path.join(cPath, f.name));
                }
                if (f.isDirectory()) {
                    traverse(path.join(cPath, f.name), callback, cPathArr);
                }
            }
        }
    });
    cPathArr.pop();
}

async function processFile(filepath, prefixClass, outDir, up, extensions, ignore) {
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

    if (fs.existsSync(outFile)) {
        die(`Output for css file: '${outFile}' already exists`);
    }
    console.log(`Isolate CSS: ${filepath} -> ${outFile}`);
    return isolateCss(filepath, prefixClass, outFile);
}

async function processDir(dir, prefixClass, outDir, up, extensions, ignore) {
    traverse(dir, async (path) => {
        await processFile(path, prefixClass, outDir, up, extensions, ignore);
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
const createOutDir = argv.createOutDir;

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
                await processFile(f, prefixClass, outDir, up, extensions, ignore);
            } else if (stats.isDirectory()) {
                console.log('processing directory ' + f);
                await processDir(f, prefixClass, outDir, up, extensions, ignore);
            }
        }
    })
}
