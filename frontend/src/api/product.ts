// バックエンドの /products に合わせた型と取得関数
const baseURL = "http://localhost:8000/products";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number | null; // セール前の価格。null はセール対象外
  rating: number; // 0〜5
  reviewCount: number;
};

export type ProductPage = {
  items: Product[];
  nextCursor: string | null; // null は最後のページ
};

export const fetchProducts = async (limit: number, after?: string): Promise<ProductPage> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  // サーバーが応答しないときに「読み込み中」のまま止まらないよう、10 秒で打ち切る
  const response = await fetch(`${baseURL}?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`商品の取得に失敗しました (${response.status})`);
  return response.json();
};

// 写真は商品情報とは別に、写真取得の API から取得する
export const productImageURL = (id: string) => `${baseURL}/${id}/image`;
