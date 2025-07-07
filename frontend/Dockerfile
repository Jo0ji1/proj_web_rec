# Use uma imagem leve com Python já instalado
FROM python:3-alpine

# Cria o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários
COPY . .

# Expõe a porta que o Railway vai mapear
EXPOSE  $PORT

# Comando para servir arquivos estáticos
CMD ["sh", "-c", "python3 -m http.server $PORT --directory ."]
