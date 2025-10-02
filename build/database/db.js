"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
if (!config_1.SUPABASE_URL || !config_1.SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL o clave anónima no configurada");
}
exports.supabase = (0, supabase_js_1.createClient)(config_1.SUPABASE_URL, config_1.SUPABASE_ANON_KEY);
