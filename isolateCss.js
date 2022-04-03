import os from "os";
import fs from "fs/promises";
import path from "path";
import sass from "sass";

export async function isolateCss(cssFile, prefixClass, outFile) {
    if ( typeof isolateCss.tmpdir == 'undefined' ) {
        isolateCss.tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'isolate-css-'));
        process.on('exit', () => {
            fs.rmdir(isolateCss.tmpdir);
        })
    }
    const tmpDir = isolateCss.tmpdir;

    await fs.copyFile(cssFile, path.join(tmpDir, 'style.css'))
    const scssContent = `
.${prefixClass} {
  @import 'style';
}`;

    await fs.writeFile(path.join(tmpDir, 'isolate.scss'), scssContent, {encoding: 'utf-8'});
    const result = sass.compile(path.join(tmpDir, 'isolate.scss'))
    await fs.unlink(path.join(tmpDir, 'style.css'));
    await fs.unlink(path.join(tmpDir, 'isolate.scss'));
    await fs.writeFile(outFile, result.css, {encoding: 'utf-8'});
}
