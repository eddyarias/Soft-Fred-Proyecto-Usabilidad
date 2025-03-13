
# Imagen base de Python
FROM python:3.10-slim

# Configurar el directorio de trabajo
WORKDIR /app

# Instalar las dependencias
COPY app/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY app /app

# Exponer el puerto del servidor Flask
EXPOSE 5000

# Comando para ejecutar Flask
CMD ["python", "server-pictionary.py"]
