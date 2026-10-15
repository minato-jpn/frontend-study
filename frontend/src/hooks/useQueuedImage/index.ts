import { useEffect, useState, type RefObject } from "react";

// ブラウザが同じサーバーへ同時に張る接続は 6 本ほど。画像の取得で埋まると商品情報の取得が後ろで待たされるので、
// 画像に使うのは MAX_IMAGE_REQUESTS 本までにして、残りを商品情報の取得用に空けておく
const MAX_IMAGE_REQUESTS = 4;
// 速くスクロールして通り過ぎるだけのカードの画像は取りに行かないよう、少し留まってから取得を始める
const START_DELAY_MS = 150;

type Waiter = { start: () => void; distance: () => number };
let active = 0;
const waiting: Waiter[] = [];

const releaseSlot = () => {
  if (waiting.length === 0) {
    active--;
    return;
  }
  // 空いた枠は、待っている中で画面にいちばん近い画像に渡す
  let nearest = 0;
  for (let i = 1; i < waiting.length; i++) {
    if (waiting[i].distance() < waiting[nearest].distance()) nearest = i;
  }
  const [next] = waiting.splice(nearest, 1);
  next.start();
};

// 要素と表示領域の距離 (px)。表示領域に入っていれば 0
const distanceToViewport = (element: Element | null) => {
  if (!element) return Infinity;
  const rect = element.getBoundingClientRect();
  if (rect.bottom < 0) return -rect.bottom;
  if (rect.top > window.innerHeight) return rect.top - window.innerHeight;
  return 0;
};

// enabled の間だけ画像を取得し、表示用の URL を返す。取得は同時に数本までに絞って順番待ちさせる。
// <img src> だと要素を外してもブラウザが取得を続けて接続を占有するので、fetch で取って外れたら中断する
export const useQueuedImage = (url: string, enabled: boolean, ref: RefObject<Element | null>) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let held = false;
    let objectURL: string | null = null;
    const release = () => {
      if (!held) return;
      held = false;
      releaseSlot();
    };
    const waiter: Waiter = {
      start: async () => {
        held = true;
        try {
          // ブラウザの HTTP キャッシュは fetch でも効くので、一度取った画像は通信せずに返る。
          // 接続が固まったときに枠を握ったままにならないよう、10 秒で打ち切る
          const response = await fetch(url, {
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
          });
          if (!response.ok) return; // 取得できなかった画像は灰色の枠のままにする
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          objectURL = URL.createObjectURL(blob);
          setSrc(objectURL);
        } catch {
          // 中断したときと通信に失敗したときは何もしない
        } finally {
          release();
        }
      },
      distance: () => distanceToViewport(ref.current),
    };
    const timer = setTimeout(() => {
      if (active < MAX_IMAGE_REQUESTS) {
        active++;
        waiter.start();
      } else {
        waiting.push(waiter);
      }
    }, START_DELAY_MS);

    return () => {
      clearTimeout(timer);
      const index = waiting.indexOf(waiter);
      if (index !== -1) waiting.splice(index, 1);
      // 取得中なら通信を止め、枠もすぐ次の画像に回す
      controller.abort();
      release();
      if (objectURL) URL.revokeObjectURL(objectURL);
      setSrc(null);
    };
  }, [url, enabled, ref]);

  return src;
};
