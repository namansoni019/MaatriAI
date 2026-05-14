from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import sync, auth

app = FastAPI(title="Maatri.AI Backend", version="1.0.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],  # In production, restrict this
  allow_methods=["*"],
  allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(sync.router, prefix="/api/v1", tags=["sync"])

@app.get("/")
def root():
    return {"status": "Maatri.AI backend running", "version": "1.0.0"}
