// Import createAgent (builds a LangChain agent) and tool (wraps a function as an agent-callable tool)
import { createAgent, tool } from "langchain";
// Load environment variables (e.g. API keys) from a .env file into process.env
import "dotenv/config"
// Zod is used to define the input schema for each tool
import z from "zod";

//20-30{city : "Newyork"}
// best quote for coverage maximum

// --- What tool() does ---
// tool() is a LangChain helper that turns a plain function into something the LLM can call.
// It does NOT run the function itself when you write this code — it just registers it.
// Call signature: tool(handlerFn, metadata)
//   - handlerFn(input, config): the actual JS/TS logic that runs when the model decides to
//     call this tool. `input` is the parsed, schema-validated arguments the model produced;
//     `config` carries per-invocation runtime data (see agent2.ts+ for how `config.context` is used).
//   - metadata.name: the identifier the model uses internally to request this tool.
//   - metadata.description: natural-language text the model reads to decide WHEN to call it —
//     this is the model's only insight into the tool's purpose, so it must be accurate.
//   - metadata.schema: a Zod schema describing the expected input shape. LangChain converts this
//     to a JSON Schema the model uses to format its tool call, and validates the model's output
//     against it before your handler function ever runs.
// At runtime: the model reads the tool's name/description/schema (passed into createAgent's
// `tools` array below), decides to call it, LangChain validates the model-generated arguments
// against `schema`, then invokes your handler function and feeds the return value back to the model.

// Define a "get_weather" tool. The first argument is the function the agent calls;
// the second argument is its metadata (name, description, input schema).
const getWeather = tool( (input)=> {
    //${input.city} -by getting weather  - returned Sunny
    // Hardcoded/mock response — always reports "sunny" for the requested city
    return `Its  sunny in ${input.city} `
    } ,
    {
        name : "get_weather", // Tool name the model uses to invoke it
        description : "Get the weather for a given city", // Tells the model when to use this tool
        schema : z.object({
            city : z.string() // Expects a single "city" string argument

        })
    }
);

// Define a "get_time" tool, same pattern as getWeather above
 const getTime = tool( (input)=>{
    // Hardcoded/mock response — always returns 3:00PM regardless of the city
    return `The current time in ${input.city} is 3:00PM`
 },
    {
        name : "get_time",
        description : "Get current time for a given city",
        schema : z.object({
            city :z.string()
        })
    }
 )

// Build the agent, wiring in the model to use and the list of tools it may call
const agent = createAgent(
    {model :"claude-sonnet-4-5-20250929", // Claude model that powers the agent's reasoning
     tools: [getWeather,getTime] // Tools the agent can choose to invoke
     },



    );

// Run the agent with a single user message; the agent decides which tool(s) to call
const response = await agent.invoke({
   // messages : [{role : "user",content: "What is weather in newyork?"}]
  //  messages : [{role : "user",content: "What is time in newyork?"}]
     // Active request: asks for both weather and time, so the agent should call both tools
     messages : [{role : "user",content: "What is weather & time in newyork?"}]
});
// Print the full agent response object (includes the full message history plus tool calls)
console.log(response);
// const longMessage = response.messages[response.messages.length-1].content
// console.log(longMessage);
