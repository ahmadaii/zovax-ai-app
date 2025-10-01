import os
from dotenv import load_dotenv
load_dotenv()

from langchain_openai.chat_models import ChatOpenAI, AzureChatOpenAI


def ZovaxGPT4Chat(temperature=0,streaming=True):
  return ChatOpenAI(
    temperature=temperature, 
    model="gpt-4-0125-preview",
    openai_api_key=os.getenv('OPENAI_API_KEY'),
    streaming=streaming,
    callbacks=[]
  )

def ZovaxGPT35Chat(temperature=0,streaming=True):
  return AzureChatOpenAI(
    temperature=temperature,
    azure_endpoint=os.getenv('AZURE_BASE_URL'),
    openai_api_version="2023-07-01-preview",
    deployment_name=os.getenv('AZURE_DEPLOYMENT_NAME'),
    openai_api_key=os.getenv('AZURE_API_KEY'),
    openai_api_type="azure",
    streaming=streaming,
    model_version="0613"
  )