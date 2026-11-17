import { detectInstallPlatform, isInstallPlatform } from "../lib/install-platform";

/** Native radio controls work without scripts; enhance their default and share explicit choices. */
class InstallTabs extends HTMLElement {
  #controller: AbortController | undefined;
  connectedCallback(): void {
    this.#controller?.abort();
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    const choices = [...this.querySelectorAll<HTMLInputElement>('input[name="install-os"]')];
    const render = (): void => {
      const explicit = new URL(location.href).searchParams.get("os");
      const selected = isInstallPlatform(explicit)
        ? explicit
        : (detectInstallPlatform(
            navigator.platform,
            navigator.userAgent,
            navigator.maxTouchPoints,
          ) ?? "macos");
      for (const choice of choices) choice.checked = choice.value === selected;
    };
    this.addEventListener(
      "change",
      (event) => {
        if (!(event.target instanceof HTMLInputElement) || !choices.includes(event.target)) return;
        const url = new URL(location.href);
        url.searchParams.set("os", event.target.value);
        history.pushState(null, "", url);
      },
      { signal },
    );
    addEventListener("popstate", render, { signal });
    render();
  }
  disconnectedCallback(): void {
    this.#controller?.abort();
  }
}
customElements.define("install-tabs", InstallTabs);
