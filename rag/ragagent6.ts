import { MultiServerMCPClient } from "@langchain/mcp-adapters";  
import { createAgent, tool } from "langchain";
import "dotenv/config"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import z from "zod";




const client = new MultiServerMCPClient({

    ecommerce : {

        transport : "stdio",
        command : "node",
        args : ["/Users/rahulshetty/Documents/playground/mcp-ecommerce-crud/dist/mcp/server.js"]
    }
})


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

const mcpTools = await client.getTools();


const agent = createAgent({
    model : "claude-sonnet-4-5-20250929",
    tools : [...mcpTools,retrieve]
})


const response = await agent.invoke({
    messages : [{role: "user",content : "Get product with id 28 and check if that product name match with our Company offerings"}]
});
console.log(response);
