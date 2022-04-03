import fs from "fs/promises";
import path from "path";
import less from "less";
import prettier from "prettier";

export async function isolateCss(cssFile, prefixClass, outFile) {
    const cssContent = await fs.readFile(cssFile, {encoding: 'utf-8'});
    const lessContent = `
.${prefixClass} {
    ${prettier.format(cssContent, { parser: "css" })}
}`;
    const out = await less.render(lessContent);
    return fs.writeFile(outFile, out.css, {encoding: 'utf-8'});
}
