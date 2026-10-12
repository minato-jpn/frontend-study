import { Markdown } from "@tanstack/markdown/react";
const report = `

# レポートの作成結果
## 今月の収入
### 270000円
## 今月の支出
### 140000円
## 週あたりの目標
### 項目
|     項目     |     支出額   | 
|     ---      |     ---      | 
|     食費     |   30000   円 |
|    交際費    |    2394   円 |
| ガス・光熱費 |    3433   円 |
|     趣味     |    10100  円 |
|    その他    |    20000 円  |

`;
export const Report = () => {
  return <Markdown>{report}</Markdown>;
};

