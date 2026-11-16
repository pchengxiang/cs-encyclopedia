import type { FunctionCategory } from '../types'

export const functionCategories: FunctionCategory[] = [
  { id: '01', name: '專用領域型', label: 'scope', description: '針對特定領域、產業或問題提供專用的描述方式與解決機制。' },
  { id: '02', name: '裝載器具型', label: 'human&technology', description: '透過實體或虛擬設備延伸或改變人與資訊系統的互動。' },
  { id: '03', name: '地域呈現型', label: 'info&space', description: '建立資訊與物理或虛擬空間之間的對應、定位及呈現。' },
  { id: '04', name: '轉變資料型', label: 'tech&info', description: '轉換、分析、生成、編碼或解讀資料與資訊。' },
  { id: '05', name: '系統接口型', label: 'system&interface', description: '建立不同系統之間的識別、存取與功能介接。' },
  { id: '06', name: '協定通訊型', label: 'protocol&communication', description: '以共同規則規範設備或系統之間的資訊交換與傳輸。' },
  { id: '07', name: '安全門鎖型', label: 'security&access', description: '保護系統、資料與資源，並控制驗證、授權及存取權限。' },
  { id: '08', name: '計算運行型', label: 'computation&execution', description: '執行指令與運算程序，或提供程式運行環境。' },
  { id: '09', name: '資料儲存型', label: 'data&storage', description: '保存、組織、索引、讀取及管理持久化資料。' },
  { id: '10', name: '資源管理型', label: 'resource&management', description: '分配、調度、限制與回收系統運行所需的計算資源。' },
  { id: '11', name: '感知擷取型', label: 'sensing&acquisition', description: '從環境、設備或其他系統取得原始資訊與狀態。' },
  { id: '12', name: '自動控制型', label: 'control&automation', description: '依規則、條件或回饋自動控制設備、程序及系統行為。' },
  { id: '13', name: '觀測監控型', label: 'observability&monitoring', description: '蒐集、記錄、呈現與分析系統狀態，以協助監測及診斷。' },
  { id: '14', name: '開發建構型', label: 'development&building', description: '協助軟體開發、版本與依賴管理、編譯、打包及交付。' },
  { id: '15', name: '測試驗證型', label: 'testing&validation', description: '檢查及驗證系統、程式或資料是否符合規格與品質要求。' },
  { id: '16', name: '編排協調型', label: 'orchestration&coordination', description: '組織及協調多個服務、程序或元件按流程共同運作。' },
]

export const getFunctionCategory = (id: string) => functionCategories.find(category => category.id === id)!
