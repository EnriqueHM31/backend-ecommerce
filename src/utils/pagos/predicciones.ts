// Función para guardar compras persistentes
import { DATA_FILE } from '../../constants/prediccion';
import fs from 'fs';

interface Compra {
    usuario: string;
    producto: string;
    cantidad?: number;
}

export async function guardarCompras({ comprasPersistentes }: { comprasPersistentes: Compra[] }) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(comprasPersistentes, null, 2));
}