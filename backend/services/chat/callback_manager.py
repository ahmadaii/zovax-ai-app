from typing import Any, Dict, List, Optional
from uuid import UUID
from langchain.callbacks.base import AsyncCallbackHandler

class StreamMessagesCallbackHandler(AsyncCallbackHandler):

    """Callback handler class responsible for streaming tokens through asyncio queue"""
    
    def __init__(self, queue):
            self.queue = queue
            self.start = False
            self.buffer =''

    async def on_llm_new_token(self, token, **kwargs) -> None:
        if token is not None:
            self.buffer += token  # Append the new token to the buffer
            if len(self.buffer) >= 1:
                if self.start == False:
                    await self.queue.put("START")
                self.start = True
                await self.queue.put(self.buffer)
                self.buffer = ''  # Clear the buffer

    async def on_llm_end(self, response, **kwargs) -> None:
        if self.start == True:
            if self.buffer:  # If there's anything left in the buffer, put it in the queue
                await self.queue.put(self.buffer)

class StreamToolUseCallbackHandler(AsyncCallbackHandler):
    def __init__(self, queue):
            self.queue = queue
    
    #async def on_chain_start(
    #    self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any
    #) -> Any:
    #    await self.queue.put("Working on an answer...")

    async def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, **kwargs: Any
    ) -> Any:
        print(serialized)
        if serialized['name'] == 'grant_program_search':
            await self.queue.put("Saving collected info... ")
    
    async def on_tool_end(self, output: str, **kwargs: Any) -> Any:
        await self.queue.put("Done.")
    
    async def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> Any:
        await self.queue.put("END")