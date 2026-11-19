import { box, dollars, dotPoint } from "../lib/traffic-shared";
import { required } from "./dom";

/**
 * The traffic plays once, the first time it is on screen: the meters count up for `RUN`, and the
 * last dots finish crossing within `TRAVEL`, under five seconds in all. The totals then hold.
 */
const RUN = 3000;
/** Dots spawned per second on each side, and how long one takes to cross. */
const RATE = 60;
const TRAVEL = 1300;

const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

interface BandData {
  readonly share: number;
  readonly from: [number, number];
  readonly to: [number, number];
  readonly color: string;
}

interface Dot {
  readonly band: BandData;
  readonly u: number;
  readonly speed: number;
  t: number;
}

interface Side {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly bands: BandData[];
  readonly cumulative: number[];
  dots: Dot[];
  width: number;
  height: number;
}

const pair = (value: string | undefined): [number, number] => {
  const [a = 0, b = 0] = (value ?? "").split(" ").map(Number);
  return [a, b];
};

/** Each panel's canvas and bands, read from the markup the build placed. */
function readSide(stage: HTMLElement): Side {
  const canvas = required(stage, "canvas", HTMLCanvasElement);
  const context = canvas.getContext("2d");
  if (!context) throw new TypeError("Expected a 2D canvas context");
  const caps = [...stage.querySelectorAll<SVGRectElement>(".cap")];
  const bands = [...stage.querySelectorAll<SVGPathElement>(".band")].map((path, i) => ({
    share: Number(path.dataset["share"]),
    from: pair(path.dataset["from"]),
    to: pair(path.dataset["to"]),
    color: caps[i] ? getComputedStyle(caps[i]).fill : "white",
  }));
  let sum = 0;
  const cumulative = bands.map((band) => (sum += band.share));
  return { canvas, context, bands, cumulative, dots: [], width: 0, height: 0 };
}

function setMeters(meters: readonly HTMLElement[], fraction: number): void {
  for (const meter of meters) {
    const value = fraction * Number(meter.dataset["total"]);
    meter.textContent = dollars(value);
  }
}

function draw(side: Side): void {
  const { context, width, height } = side;
  context.clearRect(0, 0, width, height);
  const radius = Math.max(width / 260, 2.5);
  for (const dot of side.dots) {
    const [x, y] = dotPoint(dot.band.from, dot.band.to, dot.u, dot.t);
    context.globalAlpha = dot.t > 0.92 ? ((1 - dot.t) / 0.08) * 0.9 : 0.9;
    context.fillStyle = dot.band.color;
    context.beginPath();
    context.arc((x / box.width) * width, (y / box.height) * height, radius, 0, Math.PI * 2);
    context.fill();
  }
}

/** One call enters both panels at once and takes the same share of the routes on each. */
function spawn(sides: readonly Side[]): void {
  const r = Math.random();
  for (const side of sides) {
    const band =
      side.bands[
        Math.max(
          side.cumulative.findIndex((c) => r <= c + 1e-9),
          0,
        )
      ];
    if (!band) continue;
    const speed = 1 / (TRAVEL * (0.85 + Math.random() * 0.3));
    side.dots.push({ band, u: 0.12 + Math.random() * 0.76, speed, t: 0 });
  }
}

/** Matches each canvas's pixels to its displayed size, measuring every canvas before writing. */
function sizeCanvases(sides: readonly Side[]): void {
  const ratio = devicePixelRatio;
  const rects = sides.map((side) => side.canvas.getBoundingClientRect());
  sides.forEach((side, i) => {
    const rect = rects[i];
    if (!rect) return;
    side.width = Math.round(rect.width * ratio);
    side.height = Math.round(rect.height * ratio);
    side.canvas.width = side.width;
    side.canvas.height = side.height;
    draw(side);
  });
}

/**
 * Animates the two traffic panels together, once: dots flow along each route in proportion to its
 * share, and the meters count up to the recorded totals. The totals are in the HTML already, so
 * without scripts or under reduced motion the panels show the finished replay.
 */
class TrafficCompare extends HTMLElement {
  #controller: AbortController | undefined;
  #observers: (IntersectionObserver | ResizeObserver)[] = [];
  #frame: number | undefined;
  #sides: Side[] = [];
  #meters: HTMLElement[] = [];
  #elapsed = 0;
  #spawnDebt = 0;
  #last: number | undefined;
  #onScreen = false;
  /** The run waits until the meters are fully in view, so the count-up is seen from the start. */
  #ready = false;
  #done = false;

  connectedCallback(): void {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    this.#meters = [...this.querySelectorAll<HTMLElement>("[data-meter]")];
    // The totals are in the HTML for readers without motion; with motion they count up from zero.
    if (!reducedQuery.matches) setMeters(this.#meters, 0);
    this.#sides = [...this.querySelectorAll<HTMLElement>("[data-side]")].map((stage) =>
      readSide(stage),
    );
    const resize = new ResizeObserver(() => {
      sizeCanvases(this.#sides);
    });
    for (const side of this.#sides) resize.observe(side.canvas);
    const visible = new IntersectionObserver(([entry]) => {
      this.#onScreen = entry?.isIntersecting ?? false;
      this.#update();
    });
    visible.observe(this);
    const lastMeter = this.#meters.at(-1);
    const ready = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting !== true) return;
        this.#ready = true;
        ready.disconnect();
        this.#update();
      },
      { threshold: 1 },
    );
    if (lastMeter) ready.observe(lastMeter);
    this.#observers = [resize, visible, ready];
    const update = (): void => {
      this.#update();
    };
    document.addEventListener("visibilitychange", update, { signal });
    reducedQuery.addEventListener("change", update, { signal });
  }

  disconnectedCallback(): void {
    this.#controller?.abort();
    for (const observer of this.#observers) observer.disconnect();
    this.#stop();
  }

  #tick = (now: number): void => {
    const dt = Math.min(now - (this.#last ?? now), 60);
    this.#last = now;
    this.#elapsed += dt;
    const fraction = Math.min(this.#elapsed / RUN, 1);
    setMeters(this.#meters, fraction);
    if (fraction < 1) {
      this.#spawnDebt += (dt * RATE) / 1000;
      for (; this.#spawnDebt >= 1; this.#spawnDebt -= 1) spawn(this.#sides);
    }
    for (const side of this.#sides) {
      side.dots = side.dots.filter((dot) => (dot.t += dot.speed * dt) < 1);
      draw(side);
    }
    if (fraction === 1 && this.#sides.every((side) => side.dots.length === 0)) {
      this.#done = true;
      this.#frame = undefined;
      return;
    }
    this.#frame = requestAnimationFrame(this.#tick);
  };

  /** Plays while on screen, in a visible tab, with motion allowed, until it has played once. */
  #update(): void {
    if (reducedQuery.matches) {
      this.#stop();
      this.#done = true;
      for (const side of this.#sides) {
        side.dots = [];
        draw(side);
      }
      setMeters(this.#meters, 1);
      return;
    }
    const run = this.#onScreen && this.#ready && !document.hidden && !this.#done;
    if (run && this.#frame === undefined) {
      this.#last = undefined;
      this.#frame = requestAnimationFrame(this.#tick);
    } else if (!run) {
      this.#stop();
    }
  }

  #stop(): void {
    if (this.#frame !== undefined) cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
  }
}
customElements.define("traffic-compare", TrafficCompare);
