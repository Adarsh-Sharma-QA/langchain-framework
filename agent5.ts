// createAgent builds the agent; createMiddleware defines custom agent middleware; initChatModel builds a configured chat model; tool wraps a function as a callable tool
import { createAgent, createMiddleware, initChatModel, tool } from "langchain";
// Zod defines each tool's input schema and the agent's structured output schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"
// MemorySaver provides an in-memory checkpointer so the agent remembers prior turns per thread_id
import {MemorySaver} from "@langchain/langgraph"
// ChatOpenAI is a second, non-Claude model used here as a cheaper "basic" model option
import { ChatOpenAI } from "@langchain/openai";


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


// basefree

// Custom middleware that swaps which model handles a request based on conversation length.
// Runs on every model call the agent makes, intercepting and possibly rewriting the request.
const dynamicModelSelection = createMiddleware({
    name : "DynamicModelSelection",
    wrapModelCall :(request, handler)=>
    {
        // Count how many messages are in the conversation so far
        const messageCount =request.messages.length;
        // Forward the (possibly modified) request to the next step in the middleware chain
        return handler({
            ...request,
            // Once the conversation grows past 3 messages, switch to the stronger Claude model;
            // otherwise use the cheaper basicModel (gpt-4o-mini)
            model : messageCount >3? model :basicModel

        });


    },

});

// Config for conversation thread "1" and user_id "1" (resolves to Florida)
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

//if message count is less than 3 ->CheaperModel, Advanced models


// Construct the "strong" Claude model instance used once the conversation grows longer
const model = await initChatModel(
    "claude-sonnet-4-5-20250929", // Claude model to use
    {
        temperature : 0.7, timeout: 30, max_tokens : 1000 // Sampling temperature, request timeout (s), and output token cap
    }
)

// Construct the "cheap" fallback model used early in the conversation (<=3 messages)
const basicModel = new ChatOpenAI(
    {
        model : "gpt-4o-mini"
    }
)

// In-memory checkpointer — persists conversation state per thread_id across agent.invoke calls
const checkpointer = new MemorySaver();


// Build the agent. Note: no top-level "model" — the actual model choice is delegated to
// dynamicModelSelection middleware, which picks between `model` and `basicModel` per call.
const agent = createAgent({
    model : model, // Default/base model reference (also used by the middleware above)
    tools : [getUserLocation,getWeather],
    systemPrompt,
    checkpointer, // Enables multi-turn memory keyed by thread_id
    middleware: [dynamicModelSelection] as const // Applies the dynamic model-switching logic

})

// Turn 1 (thread "1"): first message, so messageCount is low -> middleware picks basicModel
const response = await agent.invoke({
    messages : [{role : "user", content : "what is weather outside?"},

    ]
},config)




// Turn 2 (same thread "1"): conversation has grown, may cross the 3-message threshold
const response1 = await agent.invoke({
    messages : [{role : "user", content : "what location did you just tell me about"},

    ]
},config)

// Turn 3 (same thread "1"): conversation is longer still -> middleware likely picks the strong model
const response2 = await agent.invoke({
    messages : [{role : "user", content : "Suggest me good places in that location"},

    ]
},config)


// Turn 4 (same thread "1", same question repeated)
const response3 = await agent.invoke({
    messages : [{role : "user", content : "Suggest me good places in that location"},

    ]
},config)

// Print the full response object from the final invocation
console.log(response3);
