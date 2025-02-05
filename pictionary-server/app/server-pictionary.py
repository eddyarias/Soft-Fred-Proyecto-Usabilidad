from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS  # Importar CORS
from palabras import palabras
import random
import time

app = Flask(__name__)
CORS(app, origins=['*'])  # Permitir CORS para todas las rutas
socketio = SocketIO(app, cors_allowed_origins="*")  # Especificar el origen de tu frontend

# clase Jugador
class Jugador:
    def __init__(self, nombre, avatar='', puntaje=0):
        self.nombre = nombre
        self.avatar = avatar
        self.puntaje = 0

# Diccionario para manejar las partidas
partidas = {}


# Función para crear un código de partida único
def generar_codigo():
    return str(random.randint(100000, 999999))

# Función para generar opciones de palabras
def obtener_palabras():
    return palabras

# Ruta para crear una partida
@app.route('/crear_partida', methods=['POST'])
def crear_partida():
    datos = request.json
    nombre_anfitrion = datos['nombre_anfitrion']

    # Generar código de partida único
    codigo_partida = generar_codigo()

    # Guardar la partida en memoria
    partidas[codigo_partida] = {
        'nombre_anfitrion': nombre_anfitrion,
        'jugadores': [],
        "max_jugadores": 2,
        'tiempo_por_ronda': 0,
        'ronda_actual': 0,
        "rondas": 0,
        'estado': 'esperando',  # puede ser 'esperando', 'jugando', 'finalizado'
        'palabra': "",
        'dibujo': "",
        'adivinanza': "",
        'mensajes': [],
        'turno': nombre_anfitrion,  # El jugador que está dibujando
        'codigo_partida': codigo_partida
    }
    #print(partidas[codigo_partida])

    return jsonify({'partida': partidas[codigo_partida]}), 200

@app.route('/palabras', methods=['GET'])
def get_opciones_palabras_route():
    try:
        opciones_palabras = random.sample(palabras, 3)
        return jsonify({'opciones': opciones_palabras}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# Ruta para iniciar la partida
@app.route('/iniciar_partida', methods=['POST'])
def iniciar_partida():
    data = request.json
    codigo_partida = data['codigo_partida']
    tiempo_por_ronda = data.get('tiempo_por_ronda')
    rondas = data.get('rondas')
    jugadores = data.get('numJugadores')
    
    if codigo_partida not in partidas:
        return jsonify({'error': 'Código de partida inválido'}), 400

    partida = partidas[codigo_partida]
    if len(partida['jugadores']) < 2:
        return jsonify({'error': 'Se necesitan al menos dos jugadores para comenzar'}), 400

    partida['estado'] = 'jugando'
    partida['tiempo_por_ronda'] = tiempo_por_ronda
    partida['rondas'] = int(rondas)
    partida['max_jugadores'] = int(jugadores)
    partida['ronda_actual'] += 1
    partida['estado'] = 'jugando'
    return jsonify({'mensaje': 'Partida iniciada'}), 200

@socketio.on('iniciar_ronda')
def iniciar_ronda(data):
    codigo_partida = data.get('codigo_partida')
    palabra = data.get('palabra')
    if codigo_partida not in partidas:
        emit('error', {'mensaje': 'Código de partida inválido'})
        return
    partida = partidas[codigo_partida]
    if partida['ronda_actual'] > partida['rondas']:
        emit('fin_partida', {'mensaje': 'Fin de la partida'})
        return
    if partida['estado'] != 'jugando':
        emit('error', {'mensaje': 'La partida no está en estado de juego'})
        return

    # Configurar el tiempo por ronda y el número de rondas
    tiempo_por_ronda = partida['tiempo_por_ronda']
    # Elegir una palabra para el dibujante
    partida['palabra'] = palabra
    partida['dibujo'] = ""  # Limpiar dibujo
    partida['adivinanza'] = ""
    dibujante = partida['turno']
    ronda = partida['ronda_actual']
    # Enviar la palabra al jugador que debe dibujar
    emit('tu_turno', {'palabra': palabra, 'dibujante': dibujante, "tiempo": tiempo_por_ronda, "estado": "jugando", "ronda": ronda}, room=codigo_partida)

# Evento de conexión (para manejar cuando un jugador se conecta)
@socketio.on('connect')
def handle_connect():
    print('Un jugador se ha conectado')

# Evento de desconexión (para manejar cuando un jugador se desconecta)
@socketio.on('disconnect')
def handle_disconnect():
    print('Un jugador se ha desconectado')

# Evento para unirse a una partida y unirse a la sala del juego
@socketio.on('unirse_partida_socket')

def unirse_partida_socket(codigo_partida, nombre_jugador, avatar):
    if codigo_partida not in partidas:
        emit('error', {'mensaje': 'Código de partida inválido'})
        return

    partida = partidas[codigo_partida]
    if len(partida['jugadores']) >= partida["max_jugadores"]:
        emit('error', {'mensaje': 'La partida está llena'})
        return
    
    nombres_existentes = [jugador.nombre for jugador in partida['jugadores']]
    if nombre_jugador in nombres_existentes:
        emit('error', {'mensaje': 'El nombre de usuario ya está en uso'})
        return
    
    if len(partida['jugadores']) == 0:
        partida['mensajes'].append({'nombre_jugador': nombre_jugador, 'mensaje': 'ha creado la partida'})
    else:
        partida['mensajes'].append({'nombre_jugador': nombre_jugador, 'mensaje': 'se ha unido a la partida'})

    partida['jugadores'].append(Jugador(nombre_jugador, avatar))
    join_room(codigo_partida)  # Unir al jugador a la sala del juego
    # Convertir objetos Jugador a diccionarios
    jugadores_serializados = [jugador.__dict__ for jugador in partida['jugadores']]
    emit('actualizar_jugadores', {'lista': jugadores_serializados, 'estado': partida['estado']}, room=codigo_partida)



# Evento para manejar los dibujos en tiempo real
@socketio.on('actualizar_dibujo')
def actualizar_dibujo(data):
    codigo_partida = data["codigo_partida"]
    dibujo = data["dibujo"]
    jugador = data["nombre_jugador"]

    if codigo_partida not in partidas:
        return

    partida = partidas[codigo_partida]
    if partida['turno'] != jugador:
        return
    
    partida['dibujo'] = dibujo
    emit('actualizar_dibujo', {'dibujo': dibujo}, room=codigo_partida)

#-------------------CHAT--------------------
# Evento para manejar los intentos de adivinanza
@socketio.on('adivinar')
def adivinar(codigo_partida,nombre, intento ):
    if codigo_partida not in partidas:
        return
    
    partida = partidas[codigo_partida] # Obtenemos los datos de la partida
    #comprobar si el intento (palabra ingresada) es igual a la palabra a adivinar (partida['palabra']) 
    if intento.lower() == partida['palabra'].lower():  
        for jugador in partida['jugadores']:
            if jugador.nombre == nombre:
                jugador.puntaje += 80
                continue
            jugador.puntaje += 20
        # fin de la ronda
        jugadores = [jugador.__dict__ for jugador in partida['jugadores']]
        if (partida['ronda_actual'] >= partida['rondas']):
            emit('fin_partida', {'mensaje': 'Fin de la partida', "jugadores": jugadores}, room=codigo_partida)
            return
        partida['ronda_actual'] += 1
        partida['turno'] = nombre
        partida['adivinanza'] = intento

        emit('mensaje_chat', {'nombre_jugador': nombre, 'mensaje': 'ha adivinado la palabra', "jugadores": jugadores } , room=codigo_partida)
        return 
    
    agregarMensaje(nombre, intento, codigo_partida)
    emit('mensaje_chat', {'nombre_jugador': nombre, 'mensaje': intento } , room=codigo_partida)


@socketio.on('temporizador_terminado')
def temporizador_terminado(data):
    codigo_partida = data.get('codigo_partida')
    tiempo_actual = data.get('tiempo_actual')
    if tiempo_actual != 0:
        return 
    if codigo_partida not in partidas:
        return
    
    partida = partidas[codigo_partida]
    for jugador in partida['jugadores']:
        jugador.puntaje += 15
    
        # fin de la ronda

    jugadores = [jugador.__dict__ for jugador in partida['jugadores']]
    if partida['ronda_actual'] >= partida['rondas']:
        emit('fin_partida', {'mensaje': 'Fin de la partida', "jugadores": jugadores}, room=codigo_partida)
        return
    # Seleccionar el siguiente jugador de manera aleatoria
    partida['ronda_actual'] += 1
    siguiente_jugador = random.choice(partida['jugadores']).nombre
    partida['turno'] = siguiente_jugador
    emit('temporizador_terminado', {'nombre_jugador': siguiente_jugador, "jugadores": jugadores}, room=codigo_partida)

# Evento que devuelve todo el chat
@socketio.on('obtener_todo_chat')
def obtener_todo_chat(codigo_partida):

    if codigo_partida not in partidas:
        return

    partida = partidas[codigo_partida]
    emit('todo_chat', list(partida['mensajes']) ,room= codigo_partida)


# Función para agregar mensajes
def agregarMensaje(nombre_jugador, mensaje, codigo_partida):
    # Al agregar un mensaje
    partida = partidas[codigo_partida]
    partida['mensajes'].append({'nombre_jugador': nombre_jugador, 'mensaje': mensaje})

# ------------------------------------------------


# Empezar el servidor
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)