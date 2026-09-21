import { createScriptElement, createStyleElement } from "../elements/index.js";
export const addStylesAndScript = (tree, classNames, headElement, htmlElement, firstStyleIndex = -1) => {
    let head = headElement;
    const html = htmlElement;
    const styleElement = createStyleElement();
    const scriptElement = createScriptElement(classNames);
    if (head) {
        if (firstStyleIndex !== -1) {
            head.children.splice(firstStyleIndex, 0, styleElement);
        }
        else {
            head.children.push(styleElement);
        }
        head.children.push(scriptElement);
    }
    else if (html) {
        head = {
            type: "element",
            tagName: "head",
            properties: {},
            children: [styleElement, scriptElement],
        };
        html.children.unshift(head);
    }
    else {
        tree.children.unshift({
            type: "element",
            tagName: "head",
            properties: {},
            children: [styleElement, scriptElement],
        });
    }
};
