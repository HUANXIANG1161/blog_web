import { getScript } from "./script.js";
import { styles } from "./styles.js";
let idCounter = 0;
const generateUniqueId = () => {
    return `rcg-${idCounter++}`;
};
const createRcgTabsElement = (tabLabels, classNames, uniqueId) => {
    return {
        type: "element",
        tagName: "div",
        properties: { className: classNames.tabContainerClass, role: "tablist" },
        children: tabLabels.map((label, i) => ({
            type: "element",
            tagName: "button",
            properties: {
                type: "button",
                className: `${classNames.tabClass}${i === 0 ? ` ${classNames.activeTabClass}` : ""}`,
                role: "tab",
                "aria-selected": i === 0 ? "true" : "false",
                "aria-controls": `${uniqueId}-block-${i}`,
                id: `${uniqueId}-tab-${i}`,
            },
            children: [{ type: "text", value: label }],
        })),
    };
};
const createCodeBlockWrapper = (codeBlock, classNames, uniqueId, idx) => {
    const isActive = idx === 0;
    return {
        type: "element",
        tagName: "div",
        properties: {
            className: `${classNames.blockContainerClass}${isActive ? ` ${classNames.activeBlockClass}` : ""}`,
            role: "tabpanel",
            "aria-labelledby": `${uniqueId}-tab-${idx}`,
            id: `${uniqueId}-block-${idx}`,
            hidden: !isActive,
        },
        children: [codeBlock],
    };
};
export const createRehypeCodeGroupElement = (codeGroup, endIndex, classNames) => {
    const { parentNode, startIndex, tabLabels } = codeGroup;
    const codeBlocks = [];
    const uniqueId = generateUniqueId();
    const rcgTabsElement = createRcgTabsElement(tabLabels, classNames, uniqueId);
    for (let i = startIndex + 1; i < endIndex; i++) {
        const codeBlock = parentNode.children[i];
        if (codeBlock.type === "element") {
            codeBlocks.push(createCodeBlockWrapper(codeBlock, classNames, uniqueId, codeBlocks.length));
        }
    }
    return {
        type: "element",
        tagName: "div",
        properties: { className: classNames.codeGroupClass },
        children: [rcgTabsElement, ...codeBlocks],
    };
};
export const createStyleElement = () => {
    return {
        type: "element",
        tagName: "style",
        properties: {},
        children: [{ type: "text", value: styles }],
    };
};
export const createScriptElement = (classNames) => {
    return {
        type: "element",
        tagName: "script",
        properties: { type: "text/javascript" },
        children: [{ type: "text", value: getScript(classNames) }],
    };
};
