import type { Database } from '@/types/database.types'

export type Lot = Database['public']['Tables']['lots']['Row']
export type LotInsert = Database['public']['Tables']['lots']['Insert']
export type Claim = Database['public']['Tables']['claims']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type LotWithSeller = Lot & {
  profiles: Pick<Profile, 'full_name' | 'company_name' | 'whatsapp_number'> | null
}
