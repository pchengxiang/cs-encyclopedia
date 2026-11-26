# 知序 · 電腦科學百科

以 React、TypeScript 與 Vite 建置的響應式技術百科。正式建置時會將 `backend/data/` 中每筆一個 JSON 檔案彙整成 `public/data/technologies.json`，前端直接從靜態檔案載入資料，不需要 API 伺服器。

## 安裝與啟動

需求：Node.js 18 或更新版本。

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`npm run dev` 會同時啟動前端與 API（本機 API 開發模式）；也可分別使用 `npm run dev:web`、`npm run dev:api`。

Vite 會在終端機顯示本機網址。正式建置與預覽：

```bash
npm run build
npm run preview
```

建置會先將資料彙整至 `public/data/technologies.json`，輸出的 `dist/` 可部署到 Cloudflare Pages、GitHub Pages 等靜態主機。`dist/index.html` 需由 HTTP 網站主機提供，不適合直接以 `file://` 雙擊開啟。

## 環境變數

| 變數 | 預設值 | 說明 |
| --- | --- | --- |
| `VITE_API_MODE` | `static` | `static` 從靜態 JSON 讀取；`mock` 使用示範資料；`rest` 呼叫 REST API |
| `VITE_API_BASE_URL` | 空字串 | REST API origin，例如 `https://api.example.com`，不含結尾斜線 |
## 獨立資料管理工具

科技項目管理器已整理為獨立專案，位於 `admin-tool/`。請參閱 [admin-tool/README.md](admin-tool/README.md) 設定 Gemini key、管理 token 與目標資料目錄。百科本身不再提供 `/bin` 管理頁或寫入 API。

正式 API 範例（本機後端已使用相同路由）：

```env
VITE_API_MODE=rest
VITE_API_BASE_URL=https://api.example.com
```

## API 對接

- `GET /api/technologies?keyword=&category_id=&function_category_id=&stage=&page=&limit=`：列表回傳 `{ items, total, page, limit }`。`category_id` 篩選領域分類；`function_category_id` 篩選主要或次要作用分類。
- `GET /api/technologies/{id}`：回傳單一技術。前端支援雙語 `name`、`development_stage`、`function_categories` 與 `target_id`／`target_name` 關係格式。
- `GET /api/categories`：回傳 Category 陣列。

每筆技術建議同時提供 `category`（或 `domain_category`）作為領域分類，以及 `function_categories` 作為作用分類。前者回答「屬於哪個知識領域」，後者回答「主要負責什麼作用」。`description` 是摘要；`purpose` 說明存在目的；`paradigm` 說明設計典範或技術類型；`key_points` 列出重要特性。關聯以穩定的 `target_id` 為主，`target_name` 供顯示。作用分類定義位於 `src/data/functionCategories.ts`。

目前提供唯讀 API：`GET /api/health` 回報服務狀態；技術列表支援搜尋、分類、階段與分頁；單筆不存在時回傳 404；`GET /api/categories` 依 JSON 資料彙整領域分類及筆數。資料檔命名為 `TECH-001.json` 等，每個檔案對應一筆技術。初始 28 筆資料由原有前端示範內容轉入；`backend/migrate-seed.js` 可重新產生這批 JSON。

型別定義位於 `src/types.ts`，前端 API client 位於 `src/api/client.ts`，後端位於 `backend/server.js`。

## 專案結構

```text
src/
  api/client.ts           REST / Mock adapter
  components/             共用版型與 UI 元件
  data/mock.ts            獨立示範資料
  pages/                  首頁、列表、詳情
  types.ts                API 資料與階段型別
  styles.css              響應式視覺樣式
backend/
  data/                   每筆技術一個 JSON 檔案
  server.js               REST API
```
