import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "dotenv/config"
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

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

 
const ragMiddleware = dynamicSystemPromptMiddleware(async (state)=>
{
  const userMessage = state.messages[0].content;
  const query = typeof userMessage === "string" ? userMessage : ""
  const retrievedDocs = await vectorStore.similaritySearch(query, 2);
  const docsContent = retrievedDocs.map((doc)=> doc.pageContent
  ).join("\n\n");

  return `You are a helpful assistant. Use the following context from the document to answer the user's question:\n\n${docsContent}`;


});










const agent = createAgent({
    model : "gpt-4o",
    tools : [],
    middleware: [ragMiddleware]
  
})
const result = await agent.invoke({
 // messages : [{role: "user", content : "What was Nike revenue in 2023 & 2025 and from which town Nike has grown into world famous footwear"}]
    messages : [{role: "user", content : "As of May 31, 2023, How many shares million shares the company has purchased?"}]
})

console.log(result);




//































