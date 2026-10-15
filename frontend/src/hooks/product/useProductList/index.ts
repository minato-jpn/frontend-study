import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProducts, type Product } from "../../../api/product";

// 縦一列だと 1 ページをすぐ見終わるので、多めに取って読み込みの回数を減らす
// （描画は仮想化しているので、件数が多くても DOM に載るのは見えている付近だけ）
const PAGE_SIZE = 1000;

// nextCursor をたどって商品を少しずつ読み込む
export const useProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  // 同じページを二重に取りに行かないためのフラグ（state だと更新が間に合わない）
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchProducts(PAGE_SIZE, cursorRef.current);
      setProducts((prev) => [...prev, ...page.items]);
      cursorRef.current = page.nextCursor ?? undefined;
      setHasMore(page.nextCursor !== null);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore]);

  useEffect(() => {
    loadMore();
    // 初回だけ読み込む
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { products, hasMore, isLoading, error, loadMore };
};
