# CS Encyclopedia Admin

獨立的科技項目管理工具。使用 Node.js 內建模組，無需安裝 npm 套件。可列出、搜尋、編輯、刪除 JSON 項目，也可使用 Gemini 建立附 Google Search 來源的可編輯草稿，並重新校準整份資料的 relations。

## 啟動

1. 複製 `.env.example` 為 `.env.local`。
2. 設定自己的 `ADMIN_TOKEN`，並填入 Google AI Studio 的 `GEMINI_API_KEY`。
3. 確認 `DATA_DIR` 指向百科的資料目錄。預設 `../backend/data`，也可設定絕對路徑。未審查草稿預設放在 `admin-tool/pending-review/`。
4. 在此資料夾執行 `npm start`，再開啟 `http://localhost:4170`。
5. 在管理頁面底部輸入相同的 `ADMIN_TOKEN`。

此工具預設只監聽本機 `127.0.0.1`，可透過 `HOST` 與 `PORT` 設定。Gemini key 僅由伺服器使用。生成會透過 Google Search 查證，並將 Gemini 回傳的來源附在草稿的 `sources` 欄位；搜尋 grounding 可能產生額外 API 費用，請仍自行檢查來源與內容。單筆與批次生成都先寫入 `PENDING_DIR`，不會直接進入正式資料。核准會將項目寫入 `DATA_DIR`，退回草稿會留在已處理紀錄中。自動排程預設關閉；啟用後依管理頁設定執行，預設台灣時間 09:00–22:00、每 4 小時一次、每日最多 3 筆。排程只在管理工具伺服器執行期間有效；伺服器重新啟動後需再次啟用。關聯校準每次都讀取目前完整資料清單，保留有效的既有關聯，只提出信心至少 95/100 且附具體理由的新關聯，每項最多 2 條候選。結果會逐筆比較，預設不勾選；只有勾選並確認後才更新各項目的 `relations`，其他欄位不會變更。修改或刪除前請確認資料目錄指向正確的位置。
