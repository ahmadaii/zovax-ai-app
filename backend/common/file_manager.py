from pathlib import Path
import sys

src_path = Path(__file__).resolve().parent.parent
sys.path.append(str(src_path))

import logging
import os
import tempfile
from typing import List

from common.config import settings


logger = logging.getLogger(__name__)

class FileManager:
    def __init__(self):
        pass

    def _create_directories(self):
        pass

    # Build the lists of files and file paths
    def add_files_and_paths(self) -> List[str]:
        pass

    def save_file(self, filename: str, contents: bytes) -> str:
        pass
