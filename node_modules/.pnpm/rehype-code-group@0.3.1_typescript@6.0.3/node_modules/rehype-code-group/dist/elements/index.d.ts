import type { Element, Root } from "hast";
import type { ClassNames } from "../options.js";
export type CodeGroup = {
    parentNode: Element | Root;
    startIndex: number;
    tabLabels: string[];
};
export declare const createRehypeCodeGroupElement: (codeGroup: CodeGroup, endIndex: number, classNames: ClassNames) => Element;
export declare const createStyleElement: () => Element;
export declare const createScriptElement: (classNames: ClassNames) => Element;
//# sourceMappingURL=index.d.ts.map