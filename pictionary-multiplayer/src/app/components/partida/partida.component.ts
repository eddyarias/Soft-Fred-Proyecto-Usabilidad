import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PartidaService } from '../../services/partida.service';
import { Subscription } from 'rxjs';
import { Partida } from '../../models/partida.model';
import { Mensaje } from '../../models/mensaje.model';
import { ModalService } from '../../services/modal.service';
import { Jugador } from '../../models/jugador.model';

@Component({
  selector: 'app-partida',
  templateUrl: './partida.component.html',
  styleUrls: ['./partida.component.css'],
  standalone: false
})
export class PartidaComponent implements OnInit, OnDestroy {
  codigoPartida: string = '';
  nombreJugador: string = '';
  jugadorTurno: string = '';
  palabraAdivinar: string = '';

  intento: string = '';
  tiempoPorRonda: number = 30;  // Ejemplo de valor
  jugadores: Jugador[] = []; // Aquí almacenamos la lista de jugadores
  estadoPartida: string = 'esperando';  // Estado inicial de la partida
  partida: Partida = {} as Partida;
  partidaSubscription: Subscription = new Subscription();
  errores: string[] = [];

  // Para el chat y mensajes
  mensajeChat: string = '';
  mensajes: Mensaje[] = [];  // Aquí almacenamos los mensajes de chat


  // Para presentar los jugadore
  avatarJugador: string = '';
  avatars: string[] = []


  // Variables de la interfaz de la partida
  mensajeTurno: string = '';

  pantallaEspera: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private partidaService: PartidaService,
    private modalService: ModalService,
    private router: Router
  ) { }


  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.nombreJugador = params['jugador'];
    });

    this.modalService.codigoPartida$.subscribe(codigo => {
      this.codigoPartida = codigo || '';
      this.avatarJugador = params['avatar'] || '';
    });
    // load anfitrion = dibujante
    this.modalService.jugadorTurno$.subscribe(nombre => {
      this.jugadorTurno = nombre || '';
    });


    this.partidaService.obtenerMensajesChat(this.codigoPartida).subscribe({
      next: (data: Mensaje[]) => {
        if (data.length === 0) {
          this.enviarMensajeChat('ha creado la partida')
        } else {
          this.mensajes = data
          this.enviarMensajeChat('ha ingresado a la partida')
        }
      }
    });
    this.iniciarEscucharChat();
  }

  ngOnDestroy(): void {
    // Cancelar suscripciones cuando el componente se destruye
    this.partidaSubscription.unsubscribe();
  }


  // En el componente donde se escucha el evento
  iniciarEscucharPartida(): void {
    this.partidaSubscription.add(
      this.partidaService.escucharUnirsePartida().subscribe(
        (jugadores: Jugador[]) => {
          // Actualiza la lista de jugadores

          console.log(jugadores)
          this.jugadores = jugadores;
          if (this.jugadores.length >= 2) {
            this.iniciarPartida()
          }
        },
        (error) => {
        }
      )
    );
  }



  escucharInicioPartida(): void {

    this.partidaService.escucharInicioPartida().subscribe({
      next: (data: any) => {
        if (this.nombreJugador === this.nombreAnfitrion) {
          this.palabraAdivinar = data.palabra;
        }
        this.nombreAnfitrion = data.dibujante;
        this.pantallaEspera = this.nombreJugador === this.nombreAnfitrion && this.palabraAdivinar === ''
        console.log('Es tu turno:', data);
      }
    });

  }




  //----------------------CHAT----------------------------

  // Escuchar mensajes de chat
  iniciarEscucharChat(): void {
    this.partidaSubscription.add(
      this.partidaService.escucharChat().subscribe({
        next: (data: Mensaje) => {
          this.mensajes.push(data);
        },
        error: (err) => console.log(err)
      })
    );
  }

  // Enviar un mensaje de chat
  enviarMensajeChat(mensaje: string = ''): void {
    // Usar el parámetro `mensaje` si está definido
    const mensajeAEnviar = mensaje.trim() || this.mensajeChat.trim();
    this.partidaService.enviarMensajeChat(this.codigoPartida, this.nombreJugador, mensajeAEnviar);
    // Limpiar el campo
    if (!mensaje.trim()) {
      this.mensajeChat = '';
    }
  }


  // Adivinar la palabra
  adivinarPalabra(intento: string): void {
    this.partidaService.adivinar(this.codigoPartida, intento);
  }

  // Función para salir de la partida
  salirDePartida(): void {
    this.partidaService.salirDeSala(this.codigoPartida);
    this.router.navigate(['/']);
  }

  cambiarEstadoPartida(nuevoEstado: string) {
    this.estadoPartida = nuevoEstado;
  }



  @ViewChild('backgroundAudio', { static: true }) backgroundAudio!: ElementRef<HTMLAudioElement>;
  isModalOpen = false;
  isMusicPlaying = false;
  currentVolume = 1;

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }
  /**
   * Cambiar el volumen de la música de fondo.
   * @param volume Nivel de volumen (entre 0 y 1).
   */
  setVolume(volume: number) {
    this.currentVolume = volume; // Guardar el volumen actual
    this.backgroundAudio.nativeElement.volume = volume;
  }

  toggleBackgroundMusic(isPlaying: boolean) {
    const audioElement = this.backgroundAudio.nativeElement;

    if (isPlaying) {
      audioElement.loop = true;
      audioElement.play().then(() => {
        this.isMusicPlaying = true;
      }).catch(error => {
      });
    } else {
      audioElement.pause();
      this.isMusicPlaying = false;
    }
  }
}
