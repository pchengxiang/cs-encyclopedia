export type Stage = 'research' | 'emerging' | 'growing' | 'mature' | 'maintenance' | 'declining'
export interface Category { id: number; name: string; description?: string; count?: number }
export interface FunctionCategory { id: string; name: string; label: string; description: string }
export interface FunctionCategoryAssignment { primary: FunctionCategory; secondary: FunctionCategory[] }
export interface Relation { target_id: number | string; target_name: string; relation_type: string }
export interface Technology { id: number | string; name: string; category: Category; development_stage?: { value: Stage; label: string }; stage?: Stage; description: string; purpose?: string; paradigm?: string; key_points?: string[]; function_categories?: FunctionCategoryAssignment; relations: Relation[]; created_at?: string }
export interface TechnologyQuery { keyword?: string; category_id?: number; function_category_id?: string; stage?: Stage; page?: number; limit?: number }
export interface PaginatedTechnologies { items: Technology[]; total: number; page: number; limit: number }
export const STAGES: Record<Stage, string> = { research: '研究階段', emerging: '新興階段', growing: '成長階段', mature: '成熟階段', maintenance: '維護階段', declining: '淘汰／停滯' }
