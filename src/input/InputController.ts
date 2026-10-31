import { normalize, vec } from "../game/math";
import type { ActionName, InputFrame, InputMode, Vec2 } from "../game/types";

const KEY_ACTIONS: Readonly<Record<string, ActionName>> = {
  KeyJ: "attack",
  KeyK: "special",
  KeyL: "ultimate",
  Space: "switch",
  KeyE: "interact",
  KeyI: "status",
  Enter: "interact",
  Escape: "pause",
};

const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

const BLOCKED_KEYS = new Set([
  ...MOVE_KEYS,
  ...Object.keys(KEY_ACTIONS),
]);

export class InputBuffer {
  private readonly downCodes = new Set<string>();
  private readonly heldActions = new Set<ActionName>();
  private readonly pressedActions = new Set<ActionName>();
  private touchMove = vec();
  private mode: InputMode = "keyboard";

  public setKey(code: string, isDown: boolean, repeat = false): void {
    this.mode = "keyboard";
    const action = KEY_ACTIONS[code];

    if (isDown) {
      const isNew = !this.downCodes.has(code);
      this.downCodes.add(code);
      if (action) {
        this.heldActions.add(action);
        if (isNew && !repeat) this.pressedActions.add(action);
      }
      return;
    }

    this.downCodes.delete(code);
    if (action) this.heldActions.delete(action);
  }

  public setTouchMove(move: Vec2): void {
    this.mode = "touch";
    const magnitude = Math.hypot(move.x, move.y);
    this.touchMove = magnitude > 1 ? normalize(move) : { ...move };
  }

  public setTouchAction(action: ActionName, isDown: boolean): void {
    this.mode = "touch";
    if (isDown) {
      if (!this.heldActions.has(action)) this.pressedActions.add(action);
      this.heldActions.add(action);
    } else {
      this.heldActions.delete(action);
    }
  }

  public consumeFrame(): InputFrame {
    let x = 0;
    let y = 0;
    if (this.downCodes.has("KeyA") || this.downCodes.has("ArrowLeft")) x -= 1;
    if (this.downCodes.has("KeyD") || this.downCodes.has("ArrowRight")) x += 1;
    if (this.downCodes.has("KeyW") || this.downCodes.has("ArrowUp")) y -= 1;
    if (this.downCodes.has("KeyS") || this.downCodes.has("ArrowDown")) y += 1;

    const keyboardMove = x !== 0 || y !== 0 ? normalize({ x, y }) : vec();
    const move = this.mode === "touch" ? { ...this.touchMove } : keyboardMove;
    const frame: InputFrame = {
      move,
      pressed: new Set(this.pressedActions),
      held: new Set(this.heldActions),
      mode: this.mode,
    };
    this.pressedActions.clear();
    return frame;
  }

  public releaseAll(): void {
    this.downCodes.clear();
    this.heldActions.clear();
    this.pressedActions.clear();
    this.touchMove = vec();
  }
}

interface TouchElements {
  zone: HTMLElement;
  stick: HTMLElement;
  actionButtons: NodeListOf<HTMLButtonElement>;
}

export class InputController {
  public readonly buffer = new InputBuffer();
  private stickPointer: number | null = null;
  private stickOrigin = vec();
  private readonly touchRemovers: (() => void)[] = [];
  private readonly touchResets: (() => void)[] = [];
  private readonly onModeChange: (mode: InputMode) => void;

  public constructor(
    private readonly target: Window,
    onModeChange: (mode: InputMode) => void,
  ) {
    this.onModeChange = onModeChange;
    target.addEventListener("keydown", this.handleKeyDown, { passive: false });
    target.addEventListener("keyup", this.handleKeyUp, { passive: false });
    target.addEventListener("blur", this.handleBlur);
  }

  public consumeFrame(): InputFrame {
    return this.buffer.consumeFrame();
  }

  public bindTouch(elements: TouchElements): void {
    const { zone, stick, actionButtons } = elements;
    const listen = (element: HTMLElement, type: string, callback: EventListener): void => {
      element.addEventListener(type, callback, { passive: false });
      this.touchRemovers.push(() => element.removeEventListener(type, callback));
    };
    const guardGestures = (element: HTMLElement): void => {
      // Scope Safari's legacy double-tap fallback to game controls. Menus and
      // page text retain normal zoom/selection; these controls use pointer input.
      for (const type of ["touchend", "dblclick", "contextmenu"]) {
        listen(element, type, event => { if (event.cancelable) event.preventDefault(); });
      }
    };
    guardGestures(zone);
    listen(zone, "pointerdown", raw => {
      const event = raw as PointerEvent;
      if (event.pointerType === "mouse") return;
      event.preventDefault();
      if (this.stickPointer !== null) return;
      this.stickPointer = event.pointerId;
      zone.setPointerCapture(event.pointerId);
      const bounds = zone.getBoundingClientRect();
      this.stickOrigin = { x: event.clientX, y: event.clientY };
      stick.style.setProperty("--stick-x", `${event.clientX - bounds.left}px`);
      stick.style.setProperty("--stick-y", `${event.clientY - bounds.top}px`);
      stick.style.setProperty("--knob-x", "0px");
      stick.style.setProperty("--knob-y", "0px");
      stick.classList.add("is-active");
      this.setMode("touch");
    });
    listen(zone, "pointermove", raw => {
      const event = raw as PointerEvent;
      if (event.pointerId !== this.stickPointer) return;
      event.preventDefault();
      const dx = event.clientX - this.stickOrigin.x;
      const dy = event.clientY - this.stickOrigin.y;
      const distance = Math.hypot(dx, dy);
      const maximum = 26;
      const scale = distance > maximum ? maximum / distance : 1;
      stick.style.setProperty("--knob-x", `${dx * scale}px`);
      stick.style.setProperty("--knob-y", `${dy * scale}px`);
      this.buffer.setTouchMove({
        x: Math.max(-1, Math.min(1, dx / maximum)),
        y: Math.max(-1, Math.min(1, dy / maximum)),
      });
    });
    const resetStick = (): void => {
      this.stickPointer = null;
      this.buffer.setTouchMove(vec());
      stick.classList.remove("is-active");
    };
    this.touchResets.push(resetStick);
    const releaseStick = (raw: Event): void => {
      if ((raw as PointerEvent).pointerId === this.stickPointer) resetStick();
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(zone, type, releaseStick);

    actionButtons.forEach(button => {
      const action = button.dataset.touchAction as ActionName | undefined;
      if (!action) return;
      const pointers = new Set<number>();
      guardGestures(button);
      const reset = (): void => {
        pointers.clear();
        button.classList.remove("is-pressed");
        this.buffer.setTouchAction(action, false);
      };
      this.touchResets.push(reset);
      const release = (raw: Event): void => {
        if (!pointers.delete((raw as PointerEvent).pointerId)) return;
        if (pointers.size === 0) reset();
      };
      listen(button, "pointerdown", raw => {
        const event = raw as PointerEvent;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        pointers.add(event.pointerId);
        button.classList.add("is-pressed");
        this.buffer.setTouchAction(action, true);
        this.setMode("touch");
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(button, type, release);
    });
  }

  public destroy(): void {
    this.handleBlur();
    for (const remove of this.touchRemovers) remove();
    this.touchRemovers.length = this.touchResets.length = 0;
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isRangeInput(event.target)) return;
    if (BLOCKED_KEYS.has(event.code)) event.preventDefault();
    this.buffer.setKey(event.code, true, event.repeat);
    this.setMode("keyboard");
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.isRangeInput(event.target)) return;
    if (BLOCKED_KEYS.has(event.code)) event.preventDefault();
    this.buffer.setKey(event.code, false);
  };

  private readonly handleBlur = (): void => {
    for (const reset of this.touchResets) reset();
    this.buffer.releaseAll();
  };

  private setMode(mode: InputMode): void {
    this.onModeChange(mode);
  }

  private isRangeInput(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement && target.type === "range";
  }
}
