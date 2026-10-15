import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { productImageURL, type Product } from "../../api/product";
import { useProductList } from "../../hooks/product/useProductList";
import { useQueuedImage } from "../../hooks/useQueuedImage";
import { useInView } from "../../hooks/useInView";

// 写真は表示領域にあるときだけ描画する。外れたら img を外して描画とメモリの負荷を減らす
// （API はキャッシュを返すので、戻ってきたときはブラウザのキャッシュから表示される）
// 画像の取得は同時に数本までに絞り、商品情報の取得が画像待ちにならないようにする
const ProductImage = ({ product }: { product: Product }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const src = useQueuedImage(productImageURL(product.id), inView, ref);
  const [loaded, setLoaded] = useState(false);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {src && (
        <img
          src={src}
          alt={product.name}
          // 大きな画像が来てもデコードでスクロールが止まらないよう、メインスレッドの外でデコードする
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        />
      )}
    </div>
  );
};

// スクロールのたびに一覧が再描画されるので、商品が変わらないカードは描き直さない
const ProductCard = memo(({ product }: { product: Product }) => {
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  return (
    <article
      style={{
        display: "flex",
        gap: 12,
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "0 0 140px",
          aspectRatio: "1 / 1",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--code-bg)",
        }}
      >
        {/* 商品情報を先に描画し、写真はあとから写真取得の API で読み込む */}
        <ProductImage product={product} />
        {discount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              padding: "0 6px",
              fontSize: 12,
              color: "#fff",
              background: "#e53935",
              borderRadius: 4,
            }}
          >
            {discount}%OFF
          </span>
        )}
      </div>
      {/* 縦一列のリスト表示なので、写真の右側に商品情報を並べる */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12 }}>{product.category}</span>
        <span
          style={{
            fontSize: 14,
            color: "var(--text-h)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.8em",
          }}
        >
          {product.name}
        </span>
        <span style={{ fontSize: 12, color: "#f5a623" }}>
          {"★".repeat(Math.round(product.rating))}
          {"☆".repeat(5 - Math.round(product.rating))}
          <span style={{ color: "var(--text)" }}> ({product.reviewCount.toLocaleString()})</span>
        </span>
        <span>
          <strong style={{ fontSize: 18, color: discount > 0 ? "#e53935" : "var(--text-h)" }}>
            ¥{product.price.toLocaleString()}
          </strong>
          {product.originalPrice && (
            <s style={{ marginLeft: 6, fontSize: 12 }}>¥{product.originalPrice.toLocaleString()}</s>
          )}
        </span>
        <button
          type="button"
          style={{
            marginTop: "auto",
            alignSelf: "flex-start",
            padding: "6px 24px",
            border: "none",
            borderRadius: 999,
            background: "var(--accent)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          カートに入れる
        </button>
      </div>
    </article>
  );
});

// カード 1 枚 (写真 140px + 余白) と、カード同士の間隔
const CARD_HEIGHT = 158;
const CARD_GAP = 12;
// 描画しているカードの先に、まだ見ていない商品がこの件数を切ったら次のページを読み込む。
// 1 ページ (1000 件) の半分ほどで先読みを始め、末尾に着くまでに次のページの取得と描画を済ませておく
const PREFETCH_REMAINING = 500;

// EC サイト風の商品一覧。一番下まで来たら次のページを読み込む
export const ProductList = () => {
  const { products, hasMore, isLoading, error, loadMore } = useProductList();
  const listRef = useRef<HTMLDivElement>(null);

  // ページ全体のスクロールで仮想化するので、一覧がページの上から何 px の位置にあるかを渡す。
  // 上にある表の高さが変わると位置もずれるので、描画のたびに測り直す
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const top = list.getBoundingClientRect().top + window.scrollY;
    if (top !== scrollMargin) setScrollMargin(top);
  });

  const virtualizer = useWindowVirtualizer({
    count: products.length,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    // 見えている範囲の前後にも多めに描画しておき、速くスクロールしても描画が追いつくようにする（前後 30 枚 ≒ 5000px）
    overscan: 30,
    scrollMargin,
  });
  const virtualItems = virtualizer.getVirtualItems();

  // 末尾の目印が見えるのを待たず、描画中の最後のカードから残り件数で判断して先に読み込む。
  // エラーのときはスクロールのたびに再試行しないよう、再読み込みボタンに任せる
  const lastRenderedIndex = virtualItems.at(-1)?.index ?? -1;
  useEffect(() => {
    if (hasMore && !error && lastRenderedIndex >= products.length - PREFETCH_REMAINING) loadMore();
  }, [hasMore, error, lastRenderedIndex, products.length, loadMore]);


  return (
    <section>
      {/* 全カード分の高さを確保し、見えている付近のカードだけを translateY で配置する */}
      <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualItems.map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              paddingBottom: CARD_GAP,
              boxSizing: "border-box",
              transform: `translateY(${item.start - scrollMargin}px)`,
            }}
          >
            <ProductCard product={products[item.index]} />
          </div>
        ))}
      </div>
      <div style={{ padding: 16, textAlign: "center" }}>
        {error ? (
          <>
            {error.message} <button onClick={loadMore}>再読み込み</button>
          </>
        ) : isLoading ? (
          "読み込み中…"
        ) : hasMore ? null : (
          `全 ${products.length.toLocaleString()} 件を表示しました`
        )}
      </div>
    </section>
  );
};
