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

Newly added highlights:
- Drag-and-drop profile and project media uploads with instant previews and randomised placeholders for users without avatars.
- Smart project creation: dropping files auto-detects languages and seeds the hashtag field, plus inline file removal.
- Inline project file viewer supporting text previews and images inside the project page.
- Version history timeline with administrator/owner rollback controls.
- Search suggestions with fuzzy matching, autocomplete dropdown, and improved results relevance scoring.
- Light/Dark theme toggle persisted per user across the application.
- Admin console actions for editing/deleting projects, verifying users, role management, and user clean-up.
- Project insights tab rendering activity breakdown graphs and version statistics.

QA sanity checklist:
1. `npm install` then `npm run build` (already executed) - ensure webpack bundling succeeds.
2. Create a project using drag-and-drop uploads; confirm auto-tag suggestions appear.
3. Upload/edit a profile image through the Edit Profile dialog; verify the avatar updates everywhere.
4. Perform a fuzzy search (e.g. mistype a project name) and confirm the suggestion dropdown lists the target.
5. Trigger a project check-in and verify the new entry appears in Version History; exercise the rollback button.
6. As an admin, edit a project via the dashboard, verify a user, and delete a test project/user to confirm backend routes.


