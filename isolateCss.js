import fs from "fs/promises";
import path from "path";
import less from "less";
import prettier from "prettier";
import * as csstree from 'css-tree';

function selectorToString(list) {
    return list.reduce((prev, next) => prev + csstree.generate(next), '')
}

/* TODO
 * '.prefixClass body > div' should be transformed to '.prefixClass > div'
 * '.prefixClass body' should be transformed to '.prefixClass'
 * '.prefixClass body' should be transformed to '.prefixClass'
 */

function removeRootFromSelectorList(item, list) {
    //console.log(`\tremoving ${item.data.type} ${item.data.name}`);
    const oldSelector = selectorToString(list);
    let remove = []
    remove.push(item);
    // to the left of root selectors may be combinator
    if (item.next && item.next.data.type === 'Combinator') {
        //console.log(`\tremoving combinator '${item.next.data.name}' after ${item.data.name}`);
        remove.push(item.next);
    }
    for (const r of remove) {
        list.remove(r);
    }
    console.log(`\tTransformed selector from '${oldSelector}' to ${selectorToString(list)}`);
}

function removeRootFromSelectors(css) {
    const ast = csstree.parse(css);
    csstree.walk(ast, (node, item, list) => {
        //console.log(`${node.type}: ${node.name}`);
        if (item && list) {
            if (node.type === 'TypeSelector' && node.name === 'body') {
                removeRootFromSelectorList(item, list);
            } else if (node.type === 'TypeSelector' && node.name === 'html') {
                removeRootFromSelectorList(item, list);
            } else if (node.type === 'PseudoClassSelector' && node.name === 'root') {
                removeRootFromSelectorList(item, list);
            }
        }
   });
    //console.log('Output: ');
    //console.log(csstree.generate(ast))
    return csstree.generate(ast);
}

export async function isolateCss(cssFile, prefixClass, outFile, options) {
    const cssContent = await fs.readFile(cssFile, {encoding: 'utf-8'});
    const lessContent = `
.${prefixClass} {
    ${prettier.format(cssContent, { parser: "css" })}
}`;
    const out = await less.render(lessContent, {sourceMap: {}});

    let outCss = out.css;
    if (options?.removeRootFromSelectors) {
        outCss = prettier.format(removeRootFromSelectors(out.css), { parser: "css" });
    }

    return fs.writeFile(outFile, outCss, {encoding: 'utf-8'});
}
