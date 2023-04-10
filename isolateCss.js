import fs from "fs/promises";
import path from "path";
import less from "less";
import prettier from "prettier";

export async function isolateCss(cssFile, prefixClass, removeSourceMaps, outFile) {
    const cssContent = await fs.readFile(cssFile, {encoding: 'utf-8'});
    const lessContent = `
.${prefixClass} {
    ${prettier.format(cssContent, { parser: "css" })}
}`;
    const out = await less.render(lessContent);
    let cssOut = out.css;
    if (removeSourceMaps) {
      cssOut = cssOut.replace(/# sourceMappingURL=[A-Za-z0-9-._~:/?#\[\]@!$&'()*+,;%=]*/g, '')
    }
    return fs.writeFile(outFile, cssOut, {encoding: 'utf-8'});
}
