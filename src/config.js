const env = import.meta.env || {}

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://hbovslriugwnitewnbao.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ito0eApeRfTaOwY1mEVGtg_yt9byesH'
export const WHATSAPP_NUMBER = String(env.VITE_WHATSAPP_NUMBER || '5511999999999').replace(/\D/g, '')
