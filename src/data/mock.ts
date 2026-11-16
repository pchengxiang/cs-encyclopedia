import type { Category, Stage, Technology } from '../types'
import { getFunctionCategory } from './functionCategories'
export const mockCategories: Category[] = [
  { id: 1, name: '程式語言', description: '用來描述計算與建構軟體的語言' }, { id: 2, name: '人工智慧', description: '讓機器展現智慧行為的技術' }, { id: 3, name: '網路與通訊', description: '連結裝置、服務與資料的基礎' }, { id: 4, name: '資料庫', description: '組織、儲存與查詢資料的系統' }, { id: 5, name: '作業系統', description: '管理硬體資源與程式執行環境' }, { id: 6, name: '資安', description: '保護資訊、系統與數位基礎設施' }, { id: 7, name: '雲端與 DevOps', description: '建置、部署與營運現代服務' }, { id: 8, name: '硬體與架構', description: '計算系統的底層硬體與設計' },
]
const rows: [number, string, number, Stage, string, string, number[]][] = [
 [1,'Python',1,'mature','一種強調可讀性的高階通用程式語言，廣泛應用於自動化、資料科學與網頁開發。','1991', [2,3,5]], [2,'CPython',1,'mature','Python 最主要的參考實作，以 C 語言撰寫，並提供豐富的原生擴充能力。','1994',[1]], [3,'TypeScript',1,'growing','為 JavaScript 加上靜態型別的程式語言，協助團隊在開發階段提早發現錯誤。','2012',[4,5]], [4,'JavaScript',1,'mature','網頁平台的核心程式語言，現已延伸至伺服器、桌面與行動應用程式。','1995',[3]], [5,'Rust',1,'growing','兼具記憶體安全與高效能的系統程式語言，不依賴垃圾回收器。','2010',[6]], [6,'C++',1,'mature','支援多種程式設計典範的高效能語言，常用於遊戲、系統與嵌入式開發。','1985',[5]],
 [7,'大型語言模型',2,'growing','以大量文字資料訓練的神經網路模型，能理解與生成自然語言。','2020',[8,9]], [8,'Transformer',2,'mature','以注意力機制為核心的神經網路架構，成為現代語言模型的重要基礎。','2017',[7,9]], [9,'RAG 檢索增強生成',2,'growing','結合資訊檢索與文字生成，讓模型回答時能參照外部知識來源。','2020',[7,8]], [10,'機器學習',2,'mature','透過資料訓練模型，使系統能辨識模式並改善預測結果。','1959',[7,8]], [11,'生成式 AI',2,'growing','能建立文字、圖像、音訊或程式碼等新內容的人工智慧方法。','2022',[7,8,9]],
 [12,'HTTP',3,'mature','網頁瀏覽器與伺服器交換資源時使用的應用層協定。','1989',[13,14]], [13,'HTTP/3',3,'growing','基於 QUIC 的 HTTP 版本，改善連線建立速度與網路切換韌性。','2022',[12,14]], [14,'TCP/IP',3,'mature','網際網路通訊協定套組，規範資料在不同網路間傳輸的方式。','1974',[12,13]], [15,'WebSocket',3,'mature','在瀏覽器與伺服器間提供全雙工、低延遲的持續連線。','2011',[12,16]], [16,'GraphQL',3,'growing','讓用戶端能明確指定資料需求的 API 查詢語言與執行環境。','2015',[15,12]],
 [17,'PostgreSQL',4,'mature','功能完整的開源關聯式資料庫，支援複雜查詢與可擴充資料型別。','1996',[18,19]], [18,'SQLite',4,'mature','輕量、免伺服器的關聯式資料庫，適合嵌入式與本機應用。','2000',[17]], [19,'Redis',4,'mature','以記憶體為主的資料結構儲存系統，常用作快取與訊息代理。','2009',[17,20]], [20,'Apache Kafka',4,'mature','分散式事件串流平台，用於高吞吐量的資料管道與即時處理。','2011',[19]],
 [21,'Linux',5,'mature','自由開源的類 Unix 作業系統核心，支撐伺服器、裝置與雲端基礎設施。','1991',[22,23]], [22,'Kubernetes',7,'growing','用於部署、擴展與管理容器化應用程式的開源平台。','2014',[21,24]], [23,'Docker',7,'mature','以容器封裝應用程式及其相依環境，讓開發與部署更加一致。','2013',[21,22]], [24,'Git',7,'mature','分散式版本控制系統，協助開發團隊追蹤並協作管理程式碼。','2005',[22]], [25,'零信任架構',6,'growing','以持續驗證每次存取為原則的安全模型，不預設任何請求可信。','2010',[26]], [26,'Passkeys',6,'growing','使用公開金鑰密碼學取代傳統密碼的網路驗證方式。','2022',[25]], [27,'RISC-V',8,'growing','開放標準指令集架構，允許任何人設計與實作處理器。','2010',[28]], [28,'ARM',8,'mature','廣泛應用於行動裝置與伺服器的低功耗指令集架構。','1985',[27]],
]
const context: Record<number, Pick<Technology, 'purpose' | 'paradigm' | 'key_points'>> = {
  1:{purpose:'以清晰易讀的語法快速開發腳本、應用程式與資料工具。',paradigm:'多典範：物件導向、程序式、函數式',key_points:['動態型別','自動記憶體管理']},
  2:{purpose:'執行 Python 程式，並提供 Python 與作業系統之間的核心介面。',paradigm:'以物件導向為主，支援程序式與函數式',key_points:['以 C 語言實作','參考實作']},
  3:{purpose:'在 JavaScript 專案中加入靜態型別檢查，讓大型程式碼更易維護。',paradigm:'多典範：物件導向、函數式、程序式',key_points:['編譯為 JavaScript','漸進式採用型別']},
  4:{purpose:'為網頁與各類執行環境提供互動與應用程式邏輯。',paradigm:'多典範：函數式、物件導向、事件驅動',key_points:['動態型別','事件迴圈']},
  5:{purpose:'建構效能敏感且重視記憶體安全的系統軟體。',paradigm:'多典範：函數式、程序式、特徵導向',key_points:['所有權與借用','無垃圾回收器']},
  6:{purpose:'開發需要細緻控制效能、資源與硬體的軟體。',paradigm:'多典範：物件導向、泛型、程序式',key_points:['靜態型別','手動與自動資源管理並用']},
  7:{purpose:'從大量文字中學習語言模式，產生、摘要或轉換內容。',paradigm:'深度學習；Transformer 架構常見',key_points:['以 token 為輸入單位','輸出具有機率性']},
  8:{purpose:'以注意力機制處理序列資料，是許多語言模型的基礎架構。',paradigm:'神經網路架構',key_points:['自注意力','可平行處理序列']},
  9:{purpose:'回答問題時先檢索外部資料，再將相關內容提供給生成模型。',paradigm:'檢索與生成的組合流程',key_points:['知識可外接更新','答案可附資料來源']},
  10:{purpose:'從資料找出模式，支援分類、預測與決策。',paradigm:'統計學習',key_points:['依資料訓練模型','涵蓋監督式與非監督式方法']},
  11:{purpose:'生成新的文字、圖像、音訊或其他內容。',paradigm:'生成式模型',key_points:['學習資料分布','可涵蓋多種輸出模態']},
  12:{purpose:'規範瀏覽器與伺服器如何請求及傳回網頁資源。',paradigm:'無狀態的請求／回應協定',key_points:['應用層協定','可搭配不同傳輸層']},
  13:{purpose:'以 QUIC 傳輸 HTTP 資料，改善連線建立與網路切換體驗。',paradigm:'應用層協定',key_points:['以 UDP 為基礎','支援多工串流']},
  14:{purpose:'讓不同網路上的裝置能互相定址、傳輸與路由資料。',paradigm:'分層式協定套組',key_points:['IP 負責網路層傳送','TCP 提供可靠傳輸']},
  15:{purpose:'在用戶端與伺服器間維持雙向即時通訊。',paradigm:'事件驅動的全雙工協定',key_points:['持續連線','低延遲雙向傳輸']},
  16:{purpose:'讓用戶端精確描述 API 所需資料，減少多餘請求與欄位。',paradigm:'宣告式查詢語言與執行環境',key_points:['以 schema 定義型別','單一端點查詢']},
  17:{purpose:'可靠地儲存、查詢與管理結構化資料。',paradigm:'關聯式資料庫；物件關聯式擴充',key_points:['支援 SQL','交易與資料完整性']},
  18:{purpose:'在不另設資料庫伺服器的情況下，為應用程式提供本機資料庫。',paradigm:'嵌入式關聯式資料庫',key_points:['資料存於單一檔案','零設定']},
  19:{purpose:'以記憶體資料結構支援快取、佇列與快速讀寫。',paradigm:'鍵值與資料結構儲存',key_points:['常用於快取','支援多種資料結構']},
  20:{purpose:'持久化並傳遞大量事件資料，支援串流處理與資料整合。',paradigm:'分散式事件串流平台',key_points:['主題分區','可重播事件']},
  21:{purpose:'管理處理器、記憶體、裝置與程式執行，提供系統核心能力。',paradigm:'單體核心；模組化設計',key_points:['開源核心','支援多種硬體平台']},
  22:{purpose:'協調容器化應用的部署、擴展、服務探索與復原。',paradigm:'宣告式容器編排',key_points:['以期望狀態管理','支援叢集排程']},
  23:{purpose:'封裝應用程式及其依賴，讓建置與執行環境保持一致。',paradigm:'容器化與映像分層',key_points:['共享主機核心','可攜式映像']},
  24:{purpose:'追蹤程式碼變更，支援分支、回溯與多人協作。',paradigm:'分散式版本控制',key_points:['本機完整歷史','提交形成有向無環圖']},
  25:{purpose:'降低帳號或網路位置被視為可信所帶來的存取風險。',paradigm:'以身分與情境為核心的安全架構',key_points:['每次存取都驗證','最小權限']},
  26:{purpose:'以裝置持有的金鑰登入網站，降低密碼外洩與釣魚風險。',paradigm:'公開金鑰密碼學驗證',key_points:['私鑰留在裝置','支援跨裝置同步或安全金鑰']},
  27:{purpose:'提供開放且可擴充的處理器指令集，供不同實作者設計晶片。',paradigm:'精簡指令集架構（ISA）',key_points:['開放標準','模組化擴充']},
  28:{purpose:'為處理器定義指令集，廣泛支援行動裝置與伺服器設計。',paradigm:'精簡指令集架構（ISA）',key_points:['重視能源效率','由多家廠商授權實作']},
}
const functionsById: Record<number, [string, string[]]> = {
  1:['08',['04']], 2:['08',['04']], 3:['14',['08']], 4:['08',['05']], 5:['08',['10']], 6:['08',['10']],
  7:['04',['08']], 8:['04',['08']], 9:['04',['05']], 10:['04',['08']], 11:['04',['08']],
  12:['06',['05']], 13:['06',['08']], 14:['06',['08']], 15:['06',['05']], 16:['05',['04']],
  17:['09',['04']], 18:['09',['04']], 19:['09',['10']], 20:['09',['06']],
  21:['10',['08']], 22:['16',['10']], 23:['14',['10']], 24:['14',[]],
  25:['07',['05']], 26:['07',['05']], 27:['08',['10']], 28:['08',['10']],
}
const relationKinds: Record<string, string> = {
  '1:2':'implementation', '1:3':'related_language', '1:5':'related_language',
  '2:1':'implementation_of', '3:4':'related_language', '3:5':'related_language',
  '4:3':'related_language', '5:6':'related_language', '6:5':'related_language',
}
export const mockTechnologies: Technology[] = rows.map(([id,name,cid,stage,description,year,relIds]) => {
  const [primary, secondary] = functionsById[id]
  return {
    id, name, category: mockCategories.find(c=>c.id===cid)!, stage,
    development_stage: { value: stage, label: ({research:'研究階段',emerging:'新興階段',growing:'成長階段',mature:'成熟階段',maintenance:'維護階段',declining:'淘汰／停滯'} as Record<Stage,string>)[stage] },
    description, ...context[id], function_categories: { primary: getFunctionCategory(primary), secondary: secondary.map(getFunctionCategory) },
    created_at: `${year}-01-01`,
    relations: (relIds as number[]).map(r => { const target=rows.find(x=>x[0]===r)!; return {target_id:r,target_name:target[1],relation_type: relationKinds[`${id}:${r}`] ?? 'related_technology'} }),
  }
})
