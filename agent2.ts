// Import createAgent (builds the agent) and tool (wraps a function as an agent-callable tool)
import { createAgent, tool } from "langchain";
// Zod is used to define each tool's input schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"


// System prompt instructing the agent how to behave and which tools to use in what order
const systemPrompt = `You are an expert weather forecaster.

You have access to two tools:

- get_weather_for_location: use this to get the weather for a specific location
- get_user_location: use this to get the user's location

If a user asks you for the weather, make sure you know the location first. If you can tell from the question that they mean wherever they are, use the get_user_location tool to find their location.`;


// --- What `config` does ---
// `config` is the second argument you can optionally pass to agent.invoke(input, config).
// It is NOT part of the conversation the model sees — it's out-of-band data your own code
// (tools, middleware) can read at runtime. Two fields are used in this project:
//   - config.context: an arbitrary object you define (here: {user_id}). Every tool's handler
//     function receives it as its second parameter, so tools can behave per-caller without the
//     model having to know or pass a user_id itself (e.g. getUserLocation below reads it).
//   - config.configurable.thread_id (used starting in agent4.ts): tells LangGraph's checkpointer
//     which saved conversation to load/append to, enabling multi-turn memory across invoke() calls.
// `db` here is just an extra field on the object — LangChain doesn't read it; it's passed through
// unused (a placeholder for wiring a real database connection into tools later).

// Tool that resolves a user's location from a user_id passed via invocation config/context.
// Note: the tool function receives no model-supplied input (empty schema below), only "config".
const getUserLocation = tool((_,config)=> {

   // Read user_id out of the per-invocation context (set via the second arg to agent.invoke)
   const user_id =  config.context.user_id;
   //fire datbase query to get location based on user_id/API
   // Mock lookup: user "1" is in Florida, everyone else defaults to SFO
   return user_id === "1" ? "Florida" : "SFO";

},
{
    name : "get_user_location", // Tool name the model uses to invoke it
    description : "Retrieve user information based on User Id", // When the model should call this
    schema : z.object({}) // No input fields — location is derived from config, not model input


}

);


// Tool that returns a mock weather report for a given city
const getWeather = tool( (input)=> {
    //${input.city} -by getting weather  - returned Sunny
    // Hardcoded/mock response — always "sunny" regardless of the actual city
    return `Its  sunny in ${input.city} `
    } ,
    {
        name : "get_weather",
        description : "Get the weather for a given city",
        schema : z.object({
            city : z.string() // Expects a single "city" string argument

        })
    }
);



// Config passed to agent.invoke — makes user_id "1" available to tools via config.context
const config = {
    context : {user_id : "1"},
    db : {}
}

// Alternate config simulating a different (QA) user — user_id "3" falls into the SFO default branch
const qaConfig = {
    context : {user_id : "3"},
    db : {}//qa db
}
// 12, 12->city ( )


// Build the agent with the model, available tools, and system prompt
const agent = createAgent({
    model : "claude-sonnet-4-5-20250929", // Claude model powering the agent's reasoning
    tools : [getUserLocation,getWeather], // Tools the agent can choose to call
    systemPrompt // Instructions guiding tool-use order (location first, then weather)
})

// Invoke the agent with a user message that doesn't specify a location,
// so per the system prompt the agent should call get_user_location first, then get_weather.
// qaConfig is passed as the second argument, so user_id "3" is used (resolves to "SFO").
const response = await agent.invoke({
    messages : [{role : "user", content : "what is weather outside?"},

    ]
},qaConfig)

// Print the full agent response, including all messages and tool calls made
console.log(response);
