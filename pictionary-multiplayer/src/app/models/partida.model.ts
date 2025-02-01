import { Jugador } from "./jugador.model";

// src/app/models/partida.model.ts
export interface Partida {
    codigo_partida: string;
    nombre_anfitrion: string;
    jugadores: Jugador[];
    tiempo_por_ronda: number;
    ronda_actual: number;
    estado: string;
    palabra: string;
    dibujo: string;
    adivinanza: string;
    turno: string | null;
  }
