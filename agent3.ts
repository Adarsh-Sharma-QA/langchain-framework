// createAgent builds the agent; initChatModel constructs a configured chat model instance; tool wraps a function as a callable tool
import { createAgent, initChatModel, tool } from "langchain";
// Zod defines each tool's input schema and the agent's structured output schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"
// MemorySaver would provide conversation checkpointing (imported here but unused in this file)
import { MemorySaver } from "@langchain/langgraph";


// System prompt: humorous weather forecaster persona, with guidance on tool-use order
const systemPrompt = `You are an expert weather forecaster who also speaks in humour way.

You have access to two tools:

- get_weather_for_location: use this to get the weather for a specific location
- get_user_location: use this to get the user's location

If a user asks you for the weather, make sure you know the location first. If you can tell from the question that they mean wherever they are, use the get_user_location tool to find their location.`;


// Tool that resolves a user's location using user_id from the invocation config/context
const getUserLocation = tool((_,config)=> {

   // Read user_id from the per-invocation context (passed as the second arg to agent.invoke)
   const user_id =  config.context.user_id;
   //fire datbase query to get location based on user_id/API
   // Mock lookup: user "1" maps to Florida, everyone else defaults to SFO
   return user_id === "1" ? "Florida" : "SFO";

},
{
    name : "get_user_location",
    description : "Retrieve user information based on User Id",
    schema : z.object({}) // No model-supplied input — location comes from config, not arguments


}

);


// Tool that returns a mock weather report for a given city
const getWeather = tool( (input)=> {
    //${input.city} -by getting weather  - returned Sunny
    // Hardcoded/mock response — always reports "sunny"
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



// Config for user_id "1" (resolves to Florida via getUserLocation)
const config = {
    context : {user_id : "1"},
    db : {}
}

// Alternate config for a different (QA) user, user_id "3" (resolves to SFO)
const qaConfig = {
    context : {user_id : "3"},
    db : {}//qa db
}
// 12, 12->city ( )

// Schema constraining the agent's final structured output to these two string fields
const responseFormat = z.object({
    humour_response : z.string(), // A joke/humorous remark about the weather
    weather_conditions : z.string() // The actual weather conditions reported
});


// Construct a configured chat model instance (rather than passing a bare model-name string)
const model = await initChatModel(
    "claude-sonnet-4-5-20250929", // Claude model to use
    {
        temperature : 0.7, timeout: 30, max_tokens : 1000 // Sampling temperature, request timeout (s), and output token cap
    }
)


// Build the agent with the configured model, tools, system prompt, and structured output schema
const agent = createAgent({
    model : model,
    tools : [getUserLocation,getWeather],
    systemPrompt,
    responseFormat // Forces the agent's final answer to match the Zod schema above
})

// Invoke the agent; no location given, so per the system prompt it should call
// get_user_location first (using config.context.user_id = "1" -> Florida), then get_weather.
const response = await agent.invoke({
    messages : [{role : "user", content : "what is weather outside?"},

    ]
},config)

// Print only the structured output (matching responseFormat), not the raw message history
console.log(response.structuredResponse);
