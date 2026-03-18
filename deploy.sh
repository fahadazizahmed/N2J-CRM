echo "This will stop and remove backend container, then remove backend image and create and run new image"

echo "Stoping docker for backend...."
docker stop backend-service || true

echo "Removing docker for backend...."
docker rm backend-service || true

echo "Removing docker image for backend...."
docker image rm backend-services-image:latest || true

echo "Building docker image for backend...."
docker build -t backend-services-image:latest -f dockerfile .

echo "Running docker image for backend...."
docker run -d \
  --name backend-service \
  --restart=always \
  -p 8003:8003 \
  --env-file production.env \
  -v /home/upload:/home/upload \
  backend-services-image:latest
