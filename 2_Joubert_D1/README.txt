Docker commands:
1. Move into the project directory:
   cd 2_Joubert_D1

2. Build the Docker image:
   docker build -t coderepo .

3. Run the Docker container:
   docker run -p 5000:5000 --env-file .env coderepo