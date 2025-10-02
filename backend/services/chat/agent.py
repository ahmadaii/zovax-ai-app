from services.chat.models import ZovaxGPT4Chat
from langchain.prompts import MessagesPlaceholder
from langchain.agents import AgentType, initialize_agent
from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_memory import BaseChatMessageHistory

from langchain.memory import ChatMessageHistory

#from langchain_community.chat_message_histories import ChatMessageHistory



async def run_openai_functions_agent(
        history, 
        input, 
        tools, 
        llm_stream, 
        agent_stream
    ):

        agent_kwargs = {
            "extra_prompt_messages": [MessagesPlaceholder(variable_name="memory")],
        }
        llm = ZovaxGPT4Chat()
        llm.callbacks = [llm_stream]
        
        chat_memory = ChatMessageHistory(messages=history)

        memory = ConversationBufferMemory(
            memory_key="memory", 
            return_messages=True,
            chat_memory=chat_memory
        )

        agent = initialize_agent(
            tools,
            llm,
            agent=AgentType.OPENAI_FUNCTIONS,
            verbose=False,
            agent_kwargs=agent_kwargs,
            memory=memory,
            return_intermediate_steps=False,
        )

        await agent.acall(inputs={"input": input}, callbacks=[agent_stream])
 