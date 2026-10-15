import { useEffect, useRef, useState } from "react";

// 要素ごとに IntersectionObserver を作ると数が増えたときに重いので、1 つを全要素で共有する
const callbacks = new WeakMap<Element, (inView: boolean) => void>();
let observer: IntersectionObserver | null = null;

const getObserver = () => {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) callbacks.get(entry.target)?.(entry.isIntersecting);
    },
    // 画面に入るかなり手前 (カード 10 枚分ほど) から表示扱いにして、スクロールしたときに画像が間に合うようにする
    { rootMargin: "1500px" },
  );
  return observer;
};

// 要素が表示領域 (の近く) にあるかどうか
export const useInView = <T extends Element>() => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = getObserver();
    callbacks.set(element, setInView);
    observer.observe(element);
    return () => {
      observer.unobserve(element);
      callbacks.delete(element);
    };
  }, []);

  return { ref, inView };
};
