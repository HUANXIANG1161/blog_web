export const defaultClassNames = {
    activeTabClass: "active",
    activeBlockClass: "active",
    tabClass: "rcg-tab",
    tabContainerClass: "rcg-tab-container",
    blockContainerClass: "rcg-block",
    codeGroupClass: "rehype-code-group",
};
const mergeClassNames = (defaultClass, customClass) => customClass ? `${defaultClass} ${customClass}` : defaultClass;
export const getClassNames = (customClassNames) => {
    return {
        activeTabClass: mergeClassNames(defaultClassNames.activeTabClass, customClassNames?.activeTabClass),
        activeBlockClass: mergeClassNames(defaultClassNames.activeBlockClass, customClassNames?.activeBlockClass),
        tabClass: mergeClassNames(defaultClassNames.tabClass, customClassNames?.tabClass),
        tabContainerClass: mergeClassNames(defaultClassNames.tabContainerClass, customClassNames?.tabContainerClass),
        blockContainerClass: mergeClassNames(defaultClassNames.blockContainerClass, customClassNames?.blockContainerClass),
        codeGroupClass: mergeClassNames(defaultClassNames.codeGroupClass, customClassNames?.codeGroupClass),
    };
};
export const styles = `
.${defaultClassNames.codeGroupClass} {
  display: grid;
  gap: 0.6rem;
}
.${defaultClassNames.tabContainerClass} {
  display: flex;
  border-bottom: 1px solid #ddd;
}
.${defaultClassNames.tabClass} {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: none;
  background: none;
  &.${defaultClassNames.activeTabClass} {
    border-bottom: 2px solid;
    font-weight: bold;
  }
}
.${defaultClassNames.blockContainerClass} {
  display: none;
  overflow-x: auto;
  &.${defaultClassNames.activeBlockClass} {
    display: block;
  }
}
`;
