import fs from "fs";
import path from "path";
import less from "less";

export async function isolateCss(cssFile, prefixClass, outFile) {
    const l = `
.${prefixClass} {
  @import (less) '${cssFile}';
}`;
    const out = await less.render(l);
    return new Promise ((resolve, reject) => {
        fs.writeFile(outFile, out.css, {encoding: 'utf-8'}, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}
