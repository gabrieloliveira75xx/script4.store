from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from terminal import run_command
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Terminal API",
    description="API para terminal interativo",
    version="1.0.0"
)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        cmd = request.message.strip()
        if not cmd:
            raise HTTPException(status_code=400, detail="Comando não fornecido")
        
        output = run_command(cmd)
        return {"response": output}
    except Exception as e:
        logger.error(f"Erro ao executar comando: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=16000)
