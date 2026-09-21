import { defaultClassNames } from "./styles.js";
export const getScript = (classNames) => {
    const activeTabClassNames = classNames.activeTabClass.split(" ");
    const activeBlockClassNames = classNames.activeBlockClass.split(" ");
    return `
document.addEventListener("DOMContentLoaded", function () {
  const codeGroups = document.querySelectorAll(".${defaultClassNames.codeGroupClass}");

  codeGroups.forEach((group) => {
    const tabs = group.querySelectorAll(".${defaultClassNames.tabClass}");
    const blocks = group.querySelectorAll(".${defaultClassNames.blockContainerClass}");
    let activeTab = group.querySelector(".${defaultClassNames.tabClass}.${activeTabClassNames.join(".")}");
    let activeBlock = group.querySelector(".${defaultClassNames.blockContainerClass}.${activeBlockClassNames.join(".")}");

    group.addEventListener("click", (event) => {
      const tab = event.target.closest(".${defaultClassNames.tabClass}");
      if (!tab) return;

      const index = Array.from(tabs).indexOf(tab);
      if (index === -1) return;

      if (activeTab) {
        activeTab.classList.remove(${activeTabClassNames
        .map((c) => `"${c}"`)
        .join(", ")});
        activeTab.setAttribute("aria-selected", "false");
      }
       if (activeBlock) {
        activeBlock.classList.remove(${activeBlockClassNames
        .map((c) => `"${c}"`)
        .join(", ")});
        activeBlock.setAttribute("hidden", "true");
      }

      tab.classList.add(${activeTabClassNames.map((c) => `"${c}"`).join(", ")});
      tab.setAttribute("aria-selected", "true");
      blocks[index].classList.add(${activeBlockClassNames
        .map((c) => `"${c}"`)
        .join(", ")});
      blocks[index].removeAttribute("hidden");

      activeTab = tab;
      activeBlock = blocks[index];
    });
  });
});
`;
};
