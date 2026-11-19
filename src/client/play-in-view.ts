import { required } from "./dom";

const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
/** Below this width the recording's interface text is too small to read, so it waits for a tap. */
const narrowQuery = matchMedia("(max-width: 560px)");

/**
 * Plays its muted video while it is on screen and the tab is visible, unless the visitor asks for
 * reduced motion, is on a phone-width screen, or has paused it. The video keeps its native controls.
 */
class PlayInView extends HTMLElement {
  #controller: AbortController | undefined;
  #observer: IntersectionObserver | undefined;
  connectedCallback(): void {
    const video = required(this, "video", HTMLVideoElement);
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    let onScreen = false;
    let ours = false;
    let heldByVisitor = false;
    const update = (): void => {
      const run =
        onScreen &&
        !document.hidden &&
        !reducedQuery.matches &&
        !narrowQuery.matches &&
        !heldByVisitor;
      if (run && video.paused) {
        video.play().catch(() => null);
      } else if (!run && !video.paused) {
        ours = true;
        video.pause();
      }
    };
    video.addEventListener(
      "pause",
      () => {
        // A pause the browser makes in a hidden tab is not the visitor's.
        if (!ours && !document.hidden) heldByVisitor = true;
        ours = false;
      },
      { signal },
    );
    video.addEventListener(
      "play",
      () => {
        heldByVisitor = false;
      },
      { signal },
    );
    this.#observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      update();
    });
    this.#observer.observe(video);
    document.addEventListener("visibilitychange", update, { signal });
    reducedQuery.addEventListener("change", update, { signal });
    narrowQuery.addEventListener("change", update, { signal });
  }
  disconnectedCallback(): void {
    this.#controller?.abort();
    this.#observer?.disconnect();
  }
}
customElements.define("play-in-view", PlayInView);
