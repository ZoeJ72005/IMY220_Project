Docker commands:
1. Move into the project directory:
   cd 2_Joubert_D1

2. Build the Docker image:
   docker build -t coderepo .

3. Run the Docker container:
   docker run -p 5000:5000 --env-file .env coderepo

Directory structure:
- backend/              Node.js API (Express, MongoDB models, controllers)
- frontend/             React application source
- frontend/src/components/ reusable UI components (forms, lists, project widgets)
- frontend/src/pages/   Routed pages (home, profile, project, admin, search)
- frontend/src/styles/  Global and page-specific CSS
- uploads/              Runtime directory for stored project images/files (created automatically)
