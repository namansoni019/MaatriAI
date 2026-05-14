# Maatri.AI Backend

FastAPI Sync Backend for the Maatri.AI offline-first mobile application.

## How to run locally:

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## API Docs
Once running, interactive Swagger API docs are automatically generated and available at:
[http://localhost:8000/docs](http://localhost:8000/docs)

## To deploy free on Railway.app:

1. Create a GitHub repository and push this `backend/` folder to it.
2. Sign up at [Railway.app](https://railway.app/).
3. Click **New Project** -> **Deploy from GitHub repo**.
4. Select your repository.
5. Railway will automatically detect the `requirements.txt` and start building the FastAPI app using Python.
6. Once deployed, Railway will provide you with a public URL (e.g., `https://maatri-ai-backend.up.railway.app`).
7. Update the `API_BASE_URL` in the React Native mobile app (`src/services/syncService.ts`) to this new URL.
8. Add a custom start command in Railway settings if necessary: `uvicorn main:app --host 0.0.0.0 --port $PORT`
