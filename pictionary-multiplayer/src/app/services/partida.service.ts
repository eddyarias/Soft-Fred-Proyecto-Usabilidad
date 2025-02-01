// src/app/services/partida.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Partida } from '../models/partida.model';
import { Mensaje } from '../models/mensaje.model';
import { Jugador } from '../models/jugador.model';

@Injectable({
  providedIn: 'root'
})
export class PartidaService {
  private socket: Socket;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    // Inicializar SocketIO
    this.socket = io(environment.socketUrl);
  }

  // Método para crear una partida
  crearPartida(nombreAnfitrion: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear_partida`, {
      nombre_anfitrion: nombreAnfitrion
    });
  }

  // Método para unirse a una partida
  unirsePartida(codigoPartida: string, nombreJugador: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/unirse_partida`, {
      codigo_partida: codigoPartida,
      nombre_jugador: nombreJugador
    });
  }

  // Método para iniciar la partida
  iniciarPartida(codigoPartida: string, tiempo: string, rondas: string, numJugadores: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/iniciar_partida`, {
      codigo_partida: codigoPartida,
      tiempo_por_ronda: tiempo,
      rondas: rondas,
      numJugadores: numJugadores
    });
  }

  // Emitir un dibujo en tiempo real
  actualizarDibujo(codigo_partida: string, dibujo: string, nombre_jugador: string): void {
    this.socket.emit('actualizar_dibujo', { codigo_partida, dibujo, nombre_jugador });
  }

  // Escuchar actualizaciones de dibujo
  escucharDibujo(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on('actualizar_dibujo', (data: any) => {
        observer.next(data);
      });
    });
  }

  adivinar(codigoPartida: string, intento: string): void {
    this.socket.emit('adivinar', codigoPartida, intento);
  }

  getOpcionesPalabras(): Observable<any> {
    return this.http.get(`${this.apiUrl}/palabras`);
  }


  // Recibir notificación cuando alguien acierta la palabra
  recibirAdivinanza(callback: (mensaje: string) => void): void {
    this.socket.on('acertado', (data: { mensaje: string }) => {
      callback(data.mensaje);
    });
  }

  // Obtener el estado de la partida
  obtenerEstadoPartida(codigoPartida: string): Observable<Partida> {
    return this.http.get<Partida>(`${this.apiUrl}/estado_partida/${codigoPartida}`);
  }

  unirseASala(codigoPartida: string, nombreJugador: string, avatarJugador: string): void {
    this.socket.emit('unirse_partida_socket', codigoPartida, nombreJugador, avatarJugador);
  }

  // Salir de la sala
  salirDeSala(codigoPartida: string): void {
    this.socket.emit('salir_partida_socket', codigoPartida);
  }

  // Escuchar eventos de error
  escucharErrores() {
    return new Observable<any>(observer => {
      this.socket.on('error', (error: any) => {
        observer.next(error);
      });
    });
  }

  // Iniciar la ronda
  iniciarRonda(codigoPartida: string, palabra: string): void {
    this.socket.emit('iniciar_ronda', { codigo_partida: codigoPartida, palabra });
  }

  // Escuchar si la partida ha comenzado
  escucharInicioPartida() {
    return new Observable<any>(observer => {
      this.socket.on('tu_turno', (data: any) => {
        observer.next(data);
      });
    });
  }
  // Salir de la sala
  salir() {
    this.socket.disconnect();
  }
  ngOnDestroy(): void {
    // Cerrar la conexión cuando el servicio se destruya
    this.socket.disconnect();
  }


  //------------CHAT----------

  // Obtener todos los mensjes del chat
  obtenerMensajesChat(codigoPartida: string) {
    return new Observable<Mensaje[]>(observer => {
      // Pasar el codigo de la partida
      this.socket.emit('obtener_todo_chat', codigoPartida)

      // Escuchar los mensajes
      this.socket.on('todo_chat', (data: Mensaje[]) => {
        observer.next(data); // Emitir los datos recibidos
        observer.complete(); // Completar el Observable después de emitir
      });
    });
  }

  // Escuchar los mensajes de chat
  escucharChat() {
    return new Observable<Mensaje>(observer => {
      this.socket.on('mensaje_chat', (data: { nombre_jugador: string, mensaje: string }) => {
        observer.next(data); // Emitir todo el objeto `data`
      });
    });
  }
  // Enviar mensaje de chat
  enviarMensajeChat(codigoPartida: string, nombre: string, mensaje: string): void {
    this.socket.emit('adivinar', codigoPartida, nombre, mensaje); //a def adivinar
  }
  //-----------------------------


  // En el servicio, escucha los cambios de jugadores (unión a la partida)
  escucharUnirsePartida(): Observable<Jugador[]> {
    return new Observable<Jugador[]>(observer => {
      this.socket.on('actualizar_jugadores', (response: { lista: Jugador[] }) => {
        try {
          console.log(response.lista)
          observer.next(response.lista);

        } catch (error) {
          console.error('Error al obtener la lista de jugadores', error);
        }
      });
    });
  }

  // En el servicio, escucha los cambios de jugadores (unión a la partida)
  seleccionarPalabra(codigoPartida: string, palabra: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/seleccionar_palabra`, { codigo_partida: codigoPartida, palabra });
  }

}
