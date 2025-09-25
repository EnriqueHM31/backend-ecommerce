import { createClient } from '@supabase/supabase-js'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config'


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL o clave anónima no configurada")
}

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)
