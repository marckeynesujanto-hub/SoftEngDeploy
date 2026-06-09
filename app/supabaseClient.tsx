import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Gunakan <Database> di sini
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)