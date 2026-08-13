// createAgent builds the agent; initChatModel constructs a configured chat model instance; tool wraps a function as a callable tool
import { createAgent, initChatModel, tool } from "langchain";
// Zod defines each tool's input schema and the agent's structured output schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"
// MemorySaver provides an in-memory checkpointer so the agent remembers prior turns per thread_id
import {MemorySaver} from "@langchain/langgraph"


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



// Config for conversation thread "1" and user_id "1" (resolves to Florida).
// configurable.thread_id lets the checkpointer keep this conversation's history separate.
const config = {
    configurable : {thread_id : "1"},
    context : {user_id : "1"},
    db : {}
}

// Separate conversation thread "2" for a different (QA) user, user_id "3" (resolves to SFO)
const qaConfig = {
    configurable : {thread_id : "2"},
    context : {user_id : "3"},
    db : {}//qa db
}
// 12, 12->city ( )

// Schema constraining the agent's final structured output to these two string fields
const responseFormat = z.object({
    humour_response : z.string(), // A joke/humorous remark about the weather
    weather_conditions : z.string() // The actual weather conditions reported
});


// Construct a configured chat model instance
const model = await initChatModel(
    "claude-sonnet-4-5-20250929", // Claude model to use
    {
        temperature : 0.7, timeout: 30, max_tokens : 1000 // Sampling temperature, request timeout (s), and output token cap
    }
)

// --- What MemorySaver does ---
// MemorySaver is a "checkpointer" from @langchain/langgraph. LangChain agents are built on
// LangGraph, which normally treats every agent.invoke() call as stateless — it has no memory
// of previous calls unless you give it a checkpointer.
// A checkpointer's job is to save the full graph state (here, effectively the running message
// history) after each invocation, keyed by config.configurable.thread_id, and reload that saved
// state the next time invoke() is called with the SAME thread_id. That's what lets turn 2 below
// ("what location did you just tell me about") work — the agent isn't told the location again,
// it recalls it from the checkpointed state of thread "1".
// MemorySaver specifically stores checkpoints in local process memory (a JS Map under the hood):
// fast and dependency-free, but NOT persisted to disk/DB — state is lost if the process restarts,
// and it only works within a single process (not shared across server instances). For production
// use, LangGraph offers persistent checkpointer backends (e.g. SQLite/Postgres) as drop-in
// replacements for MemorySaver.
// In-memory checkpointer — persists conversation state per thread_id across agent.invoke calls
const checkpointer = new MemorySaver();


// Build the agent with the model, tools, system prompt, structured output schema, and checkpointer
const agent = createAgent({
    model : model,
    tools : [getUserLocation,getWeather],
    systemPrompt,
    responseFormat,checkpointer // checkpointer enables multi-turn memory keyed by thread_id
})

// Turn 1 (thread "1"): no location given, so the agent should call get_user_location (-> Florida) then get_weather
const response = await agent.invoke({
    messages : [{role : "user", content : "what is weather outside?"},

    ]
},config)

// Extract just the text of the most recent (final) message from the response
const longMessage = response.messages[response.messages.length-1].content
console.log(longMessage);

// Turn 2 (same thread "1"): relies on checkpointed memory to recall "that location" from turn 1
const response1 = await agent.invoke({
    messages : [{role : "user", content : "what location did you just tell me about"},

    ]
},config)
// Extract the final message's text from this turn's response
const longMessage1 = response1.messages[response1.messages.length-1].content
console.log(longMessage1);

// Turn 3 (same thread "1"): again relies on conversation memory to know "that location"
const response2 = await agent.invoke({
    messages : [{role : "user", content : "Suggest me good places in that location"},

    ]
},config)

// Extract the final message's text from this turn's response
const longMessage2 = response2.messages[response2.messages.length-1].content
console.log(longMessage2);

// Same question asked again, but on qaConfig (thread "2", user_id "3") — a separate,
// independent conversation history with no memory of the "Florida" location from thread "1"
const response3 = await agent.invoke({
    messages : [{role : "user", content : "Suggest me good places in that location"},

    ]
},qaConfig)

// Extract the final message's text from this turn's response
const longMessage3 = response3.messages[response3.messages.length-1].content
console.log(longMessage3);
//console.log(response.structuredResponse);
