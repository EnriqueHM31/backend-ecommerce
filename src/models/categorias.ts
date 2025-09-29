import { supabase } from "@/database/db";

export class ModeloCategorias {

    static async ListarCategorias() {
        try {
            const { data, error } = await supabase.from('categorias').select('*');

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, data: data, message: 'Categorias obtenidas correctamente' };
        } catch (error) {
            return { success: false, message: error };
        }
    }
}