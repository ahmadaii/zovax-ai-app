# FOR WEB SOCKET IMPLEMENTATION
import asyncio,json
from typing import Optional, List, Dict, Any

from datetime import datetime

from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import BaseTool, StructuredTool, tool

from langchain.schema import AIMessage, HumanMessage, SystemMessage

from services.chat.callback_manager import StreamMessagesCallbackHandler, StreamToolUseCallbackHandler
from services.chat.agent import run_openai_functions_agent

async def createGen(
        history,
        llm_stream,
        agent_stream,
        queue
    ):
    
    instructions = f"""
        You are a customer service assistant for small and medium enterprises (like a local gym).  
        Your role is to answer customer queries politely, respectfully, and professionally.  
        Keep answers clear, accurate, and concise.  
        Do not hallucinate or make up information.  
        If something is unknown or unclear, politely say you don't have that information and suggest rephrasing or contacting staff.  
        Avoid politics, sexism, illegal topics.

        ** Your response must be in markdown format.
    """

    class SearchInput(BaseModel):
        data_source: str = Field("Data source to use for the search.")
        search_text: Optional[str] = Field("Text to use for finding records.")
        since: Optional[float] = Field("Timestamp to use for constraining results (inclusive).")
        until: Optional[float] = Field("Timestamp to use for constraining results (inclusive).")
        filters: Optional[List[Dict[str, Any]]] = Field("Filters to use for the search, must be an array of objects with 'key' and 'value' fields. Like this: [{'key':'contact', 'value':'John Doe'}]")

    def searchFunc(
        data_source: str, 
        search_text: str = '', 
        since: float = None, 
        until: float = None,
        filters: list = None
    ):
        if search_text == '':
            search_text = '0'
        try:
            return json.dumps(
                # filterResults(vector_store.vectorSearch(
                #     search_text,
                #     data_source=data_source,
                #     since=since,
                #     until=until,
                #     filters=filters))
                )
        except Exception as e:
            print(e)
            return f"Error: {e}" 

    latest_message = history.pop(-1)
    query = latest_message['content']

    messages = [SystemMessage(content=instructions)]
    for message in history:
        if message['type'] == 'human':
            messages.append(HumanMessage(content=message['content']))
        if message['type'] == 'assistant':
            messages.append(AIMessage(content=message['content']))
    messages.append(SystemMessage(content=f"Current Timestamp: {datetime.now().timestamp()} ({datetime.now()})"))

    searchTool = StructuredTool.from_function(
        func=searchFunc,
        name="SemanticSearch",
        description="",
        args_schema=SearchInput,
        return_direct=False,
    )
    
    task = asyncio.create_task(run_openai_functions_agent(messages, query, [searchTool], llm_stream,agent_stream))

    while True:
        res =  await queue.get()
        if res == 'END':
            break;
        if res == 'START':
            yield {"type":"first_token", "content": ""}
        else:
            yield res

    await task

async def getResponse(history=[]):
    queue = asyncio.Queue()
    llm_stream = StreamMessagesCallbackHandler(queue)
    agent_stream = StreamToolUseCallbackHandler(queue)

    async def generate():
        yield '{"type": "log", "content": "Message received, working..."}###END###\n'
        try:
            async for res in createGen(history,llm_stream,agent_stream,queue):
                yield f'{json.dumps(res)}###END###\n'
        except Exception as e:
            yield f'{json.dumps({"type": "success", "content":f"{e}"})}###END###\n'
        
        yield '{"type": "final", "content": ""}###END###\n'
    
    return generate()
