import express, { Request } from 'express';
import * as tf from '@tensorflow/tfjs';
// Tipos TypeScript
export interface Compra {
    usuario: string;
    producto: string;
    cantidad: number;
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
        conRecomendaciones?: boolean;
    };
}

export interface RequestEntrenamiento extends Request {
    body: {
        compras: Compra[];
        usuario?: string;
        topK?: number;
        conRecomendaciones?: boolean;
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