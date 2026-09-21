import type { Element, Root } from "hast";
import { type CodeGroup } from "../elements/index.js";
import type { ClassNames } from "../options.js";
export declare const isStartDelimiterNode: (node: Element) => boolean;
export declare const isEndDelimiterNode: (node: Element) => boolean;
/**
 * Handle the start delimiter node.
 * If the node is a start delimiter,
 * - create a code group object
 * - push it to the code groups stack.
 *
 * @param {Element} node - The current node being visited.
 * @param {number} index - The index of the current node in its parent's children.
 * @param {Element | Root} parent - The parent of the current node.
 * @param {CodeGroup[]} codeGroups - The stack to keep track of the last found start delimiter.
 */
export declare const handleStartDelimiter: (node: Element, index: number, parent: Element | Root, codeGroups: CodeGroup[]) => void;
/**
 * Handle the end delimiter node.
 * If the node is an end delimiter,
 * - pop the last code group from the stack
 * - create a rehype-code-group element
 * - replace the code group nodes with the rehype-code-group element.
 * - return the skip index to skip the replaced nodes.
 * - return the found status.
 * If the node is not an end delimiter, return the not found status.
 *
 * @param {number} index - The index of the current node in its parent's children.
 * @param {Element | Root} parent - The parent of the current node.
 * @param {CodeGroup[]} codeGroups - The stack to keep track of the last found start delimiter.
 * @param {ClassNames} classNames - The class names for styling code group elements.
 * @returns {Object} An object containing the found status and the skip index.
 */
export declare const handleEndDelimiter: (index: number, parent: Element | Root, codeGroups: CodeGroup[], classNames: ClassNames) => {
    found: boolean;
    skipIndex: number;
};
//# sourceMappingURL=delimiters.d.ts.map