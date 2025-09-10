
import type { RowDataPacket } from 'mysql2';
export interface Producto {
    activo: number;
    almacenamiento: string;
    bateria: string;
    camara: string;
    categoria: string;
    color: string;
    conectividad: string;
    created_at: string;
    descripcion: string;
    display: string;
    id: number;
    imagen_url: string;
    marca: string;
    precio_base: number;
    procesador: string;
    producto: string;
    producto_id: number;
    ram_especificacion: string;
    ram_variante: string;
    recomendado: number;
    sistema_operativo: string;
    sku: string;
    stock: number;
    updated_at: string;
}



export interface CartItem {
    product: Producto;
    quantity: number;
}


export interface Customer {
    id: string;
    name: string;
    email: string;
}



interface ProductoExtendido extends Producto, RowDataPacket { }

interface Pedido {
    id: number;
    usuario_id: number;
    fecha_pedido: string;
    estado: string;
    total: number;
    direccion_envio: string;
    referencias: string;
}

interface PedidoExtendido extends Pedido, RowDataPacket { }



export interface ProductoConsulta extends RowDataPacket, Producto { }

export type ProductoPartial = Partial<Producto>;

export interface ProductoExtendido extends Producto, RowDataPacket { }

export interface Pedido extends RowDataPacket {
    id: number;
    usuario_id: number;
    fecha_pedido: string;
    estado: string;
    total: number;
    direccion_envio: string;
    referencias: string;
    cliente_nombre: string;
    cliente_email: string;
}

export type PedidoPartial = Partial<Pedido>;

export interface PedidoExtendido extends Pedido, RowDataPacket { }

export interface PedidoItem extends RowDataPacket {
    id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    nombre_producto: string;
}
