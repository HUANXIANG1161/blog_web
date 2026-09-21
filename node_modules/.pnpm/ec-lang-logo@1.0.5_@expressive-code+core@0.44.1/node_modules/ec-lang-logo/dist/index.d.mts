import * as _$_expressive_code_core0 from "@expressive-code/core";
import * as icons from "simple-icons";

//#region src/index.d.ts
declare const LANGUAGE_MAP: {
  readonly js: {
    readonly icon: icons.SimpleIcon;
  };
  readonly javascript: {
    readonly icon: icons.SimpleIcon;
  };
  readonly ts: {
    readonly icon: icons.SimpleIcon;
  };
  readonly typescript: {
    readonly icon: icons.SimpleIcon;
  };
  readonly py: {
    readonly icon: icons.SimpleIcon;
  };
  readonly python: {
    readonly icon: icons.SimpleIcon;
  };
  readonly c: {
    readonly icon: icons.SimpleIcon;
  };
  readonly cpp: {
    readonly icon: icons.SimpleIcon;
  };
  readonly php: {
    readonly icon: icons.SimpleIcon;
  };
  readonly go: {
    readonly icon: icons.SimpleIcon;
  };
  readonly rust: {
    readonly icon: icons.SimpleIcon;
  };
  readonly rs: {
    readonly icon: icons.SimpleIcon;
  };
  readonly rb: {
    readonly icon: icons.SimpleIcon;
  };
  readonly ruby: {
    readonly icon: icons.SimpleIcon;
  };
  readonly swift: {
    readonly icon: icons.SimpleIcon;
  };
  readonly kotlin: {
    readonly icon: icons.SimpleIcon;
  };
  readonly kt: {
    readonly icon: icons.SimpleIcon;
  };
  readonly dart: {
    readonly icon: icons.SimpleIcon;
  };
  readonly sql: {
    readonly icon: icons.SimpleIcon;
  };
  readonly bash: {
    readonly icon: icons.SimpleIcon;
  };
  readonly sh: {
    readonly icon: icons.SimpleIcon;
  };
  readonly shell: {
    readonly icon: icons.SimpleIcon;
  };
  readonly yml: {
    readonly icon: icons.SimpleIcon;
  };
  readonly yaml: {
    readonly icon: icons.SimpleIcon;
  };
  readonly json: {
    readonly icon: icons.SimpleIcon;
  };
  readonly graphql: {
    readonly icon: icons.SimpleIcon;
  };
  readonly gql: {
    readonly icon: icons.SimpleIcon;
  };
  readonly prisma: {
    readonly icon: icons.SimpleIcon;
  };
  readonly html: {
    readonly icon: icons.SimpleIcon;
  };
  readonly css: {
    readonly icon: icons.SimpleIcon;
  };
  readonly scss: {
    readonly icon: icons.SimpleIcon;
  };
  readonly react: {
    readonly icon: icons.SimpleIcon;
  };
  readonly md: {
    readonly icon: icons.SimpleIcon;
  };
  readonly markdown: {
    readonly icon: icons.SimpleIcon;
  };
  readonly mdx: {
    readonly icon: icons.SimpleIcon;
  };
  readonly jsx: {
    readonly icon: icons.SimpleIcon;
  };
  readonly tsx: {
    readonly icon: icons.SimpleIcon;
  };
  readonly vue: {
    readonly icon: icons.SimpleIcon;
  };
  readonly svelte: {
    readonly icon: icons.SimpleIcon;
  };
  readonly astro: {
    readonly icon: icons.SimpleIcon;
  };
  readonly angular: {
    readonly icon: icons.SimpleIcon;
  };
  readonly docker: {
    readonly icon: icons.SimpleIcon;
  };
  readonly dockerfile: {
    readonly icon: icons.SimpleIcon;
  };
};
type Language = keyof typeof LANGUAGE_MAP;
type Color = 'mono' | 'original' | 'theme' | (`#${string}` & {});
interface PluginOptions {
  color: Color;
  excludedLangs: Language[];
}
declare function pluginLanguageLogo(config?: PluginOptions): _$_expressive_code_core0.ExpressiveCodePlugin;
//#endregion
export { pluginLanguageLogo };
//# sourceMappingURL=index.d.mts.map