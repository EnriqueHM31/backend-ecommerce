import express, { Request } from 'express';
// Tipos TypeScript
export interface Compra {
    usuario: string;
    producto: string;
    cantidad?: number;
    rating?: number;
}

export interface Prediccion {
    producto: string;
    score: number;
}

export interface RequestPrediccion extends Request {
    body: {
        usuario: string;
        compras?: Compra[];
        entrenar?: boolean;
        topK?: number;
    };
}

export interface RequestEntrenamiento extends Request {
    body: {
        compras: Compra[];
    };
}



export interface DatosPreprocessed {
    matriz: number[][];
    numUsuarios: number;
    numProductos: number;
}

export interface DatosEntrenamiento {
    userIds: tf.Tensor2D;
    itemIds: tf.Tensor2D;
    ratings: tf.Tensor2D;
}