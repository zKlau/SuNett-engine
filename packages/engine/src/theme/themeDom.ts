import type { Theme } from "./theme";
import { ThemeVariables } from "./variables";

export function applyTheme(theme: Theme, element: SVGElement | HTMLElement) {
  for (const [variable, value] of Object.entries(theme.variables)) {
    element.style.setProperty(variable, value);
  }
}

export function clearTheme(element: SVGElement | HTMLElement) {
  for (const variable of Object.values(ThemeVariables)) {
    element.style.removeProperty(variable);
  }
}
