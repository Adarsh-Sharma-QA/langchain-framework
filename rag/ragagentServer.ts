import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {  tool } from "langchain";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "dotenv/config"
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import z from "zod";

const pdfPaths = [
"/users/rahulshetty/downloads/ProjectDocs/nke-10k-2023.pdf",
"/users/rahulshetty/downloads/ProjectDocs/Nike-Inc-2025_10K.pdf",
"/users/rahulshetty/downloads/ProjectDocs/nike-growth-story.pdf",

]


const allDocs = [];

for(const pdfPath of pdfPaths)
{
  const loader =  new PDFLoader(pdfPath)
  const docs = await loader.load()
  allDocs.push(...docs);
}


const textSplitter = new RecursiveCharacterTextSplitter(
  { chunkSize : 1000,
    chunkOverlap : 200
  }
)

const allSplits = await textSplitter.splitDocuments(allDocs)
console.log(allSplits.length);

const embeddings = new OpenAIEmbeddings({
    model : "text-embedding-3-large"
})

const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(allSplits);

const retrieve = tool(async ({query})=>
{
  const retrievedDocs = await vectorStore.similaritySearch(query, 2);
  const docsContent = retrievedDocs.map((doc)=> doc.pageContent
  ).join("\n\n");
  return docsContent;
},
{
 name : "retrieve",
 description : "Retrieve information from multiple pdf documents",
 schema : z.object({
    query : z.string()
 })

} 

);


const emailTool = tool(({recipient,subject}) => {
    `Email sent to ${recipient} with subject ${subject}`
}, {
    name: "send_email",
    description: "send an email to some one",
    schema: z.object({
        recipient: z.string(),
        subject: z.string()
    })
})

const getWeather = tool( (input)=> {
    //${input.city} -by getting weather  - returned Sunny
    return `Its  sunny in ${input.city} `
    } ,
    {
        name : "get_weather",
        description : "Get the weather for a given city",
        schema : z.object({
            city : z.string()
            
        })
    }
);




const agent = createAgent({
    model : "gpt-4o",
    tools : [retrieve,getWeather,emailTool],
   systemPrompt :  "You have access to a tools that retrieves context from multiple PDF documents & get weather & email, use the tool to help answer user queries"
  
})

export const graph = agent;




//































