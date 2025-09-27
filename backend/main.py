from pathlib import Path
import sys

from contextlib import asynccontextmanager
import json
import logging
from typing import List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse

from common.config import settings
from common.api_utils import create_api

logging.basicConfig(
    format="%(levelname)s - %(name)s - [%(process)d] - %(message)s",
    level=settings.log_level
)

# Create a logger for this module
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")

    yield
    # Shutdown
    logger.info("Shutting down")
    # Add any cleanup code here if needed

app = create_api(title="Zovax AI App", lifespan=lifespan)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
