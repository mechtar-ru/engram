import os
from pathlib import Path
from dataclasses import dataclass

@dataclass
class Config:
    host: str = "localhost"
    port: int = 8080
    debug: bool = False

class Server:
    def __init__(self, config: Config):
        self.config = config
        self._running = False

    def start(self):
        self._running = True
        print(f"Starting on {self.config.host}:{self.config.port}")

    def stop(self):
        self._running = False

    async def handle_request(self, path: str):
        if path == "/health":
            return {"status": "ok"}
        return {"error": "not found"}

def create_app(debug=False):
    config = Config(debug=debug)
    return Server(config)
