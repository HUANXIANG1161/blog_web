"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var editor_exports = {};
__export(editor_exports, {
  extractGenerics: () => extractGenerics,
  toTSX: () => toTSX
});
module.exports = __toCommonJS(editor_exports);
var import_svelte2tsx = require("svelte2tsx");
const genericNameRE = /^(?:const |in |out )*(\w+)/;
function toTSX(code, className) {
  let result = `
		let ${className}__AstroComponent_: Error
		export default ${className}__AstroComponent_
	`;
  try {
    let tsx = (0, import_svelte2tsx.svelte2tsx)(code, { mode: "ts", isTsFile: true }).code;
    tsx = "import '@astrojs/svelte/svelte-shims.d.ts';\n" + tsx;
    if (tsx.includes("export default $$Component;")) {
      const generics = extractGenerics(tsx);
      const innerType = generics ? `ReturnType<__sveltets_Render<${generics.names}>['props']>` : `import('svelte').ComponentProps<typeof $$$$Component>`;
      const propsOnlySignature = generics ? `<${generics.params}>(props: import('@astrojs/svelte/svelte-shims.d.ts').GenericPropsWithClientDirectives<${innerType}>): any;` : `(props: import('@astrojs/svelte/svelte-shims.d.ts').PropsWithClientDirectives<${innerType}>): any;`;
      const internalsSignature = generics ? `<${generics.params}>(this: void, _internals: import('svelte').ComponentInternals, _props: ${innerType}): Record<string, any>;` : `(this: void, _internals: import('svelte').ComponentInternals, _props: ${innerType}): Record<string, any>;`;
      result = tsx.replace(
        "export default $$Component;",
        `const ${className}__AstroComponent_ = $$Component as unknown as { ${propsOnlySignature} ${internalsSignature} };
export default ${className}__AstroComponent_;`
      );
    } else {
      result = tsx.replace(
        "export default class extends __sveltets_2_createSvelte2TsxComponent(",
        `function ${className}__AstroComponent_Inner(_props: import('@astrojs/svelte/svelte-shims.d.ts').PropsWithClientDirectives<typeof Component.props>): any { return {}; }
const ${className}__AstroComponent_ = ${className}__AstroComponent_Inner as unknown as typeof ${className}__AstroComponent_Inner & { (this: void, _internals: import('svelte').ComponentInternals, _props: typeof Component.props): Record<string, any>; };
export default ${className}__AstroComponent_;
let Component = `
      );
    }
  } catch {
    return result;
  }
  return result;
}
function extractGenerics(tsx) {
  const marker = "class __sveltets_Render<";
  const startIdx = tsx.indexOf(marker);
  if (startIdx === -1) return null;
  const genericStart = startIdx + marker.length;
  let depth = 1;
  let i = genericStart;
  while (i < tsx.length && depth > 0) {
    if (tsx[i] === "<") depth++;
    if (tsx[i] === ">" && tsx[i - 1] !== "=") depth--;
    i++;
  }
  const params = tsx.substring(genericStart, i - 1);
  const names = [];
  let current = "";
  let depth2 = 0;
  let prev = "";
  for (const ch of params) {
    if (ch === "<" || ch === "(" || ch === "{" || ch === "[") depth2++;
    if (ch === ">" && prev !== "=" || ch === ")" || ch === "}" || ch === "]") depth2--;
    if (ch === "," && depth2 === 0) {
      const name = genericNameRE.exec(current.trim())?.[1];
      if (name) names.push(name);
      current = "";
    } else {
      current += ch;
    }
    prev = ch;
  }
  const lastName = genericNameRE.exec(current.trim())?.[1];
  if (lastName) names.push(lastName);
  return { params, names: names.join(", ") };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractGenerics,
  toTSX
});
