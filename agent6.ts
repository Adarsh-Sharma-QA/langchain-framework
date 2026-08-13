// createAgent builds the agent; tool wraps a function as a callable tool.
// The other three are prebuilt LangChain middlewares:
//   - llmToolSelectorMiddleware: uses a (usually cheaper/faster) LLM to pick which subset of
//     available tools are relevant to the current request, before the main model sees them —
//     useful when you have many tools and want to shrink what's shown to the main model.
//   - modelFallbackMiddleware: if a call to the primary model fails (error/timeout/rate limit),
//     automatically retries the request against the listed fallback model(s) in order.
//   - summarizationMiddleware: once the conversation exceeds a token threshold, compresses older
//     messages into a summary so the context sent to the model doesn't keep growing unbounded.
import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware, tool } from "langchain";
// Zod defines each tool's input schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"



// Tool that returns a mock web search result for a query
const searchTool = tool(({ query }) => {
    return `Search results for "${query}" : Found 5 articles are returned`
},
    {
        name: "search",
        description: "Search the internet for information",
        schema: z.object({
            query: z.string() // The search query string
        })
    })

// Tool that simulates sending an email. Note: the handler's return value is not `return`ed
// (missing `return` keyword), so this tool actually resolves to `undefined` at runtime,
// even though it looks like it builds a confirmation string.
const emailTool = tool(({recipient,subject}) => {
    `Email sent to ${recipient} with subject ${subject}`
}, {
    name: "send_email",
    description: "send an email to some one",
    schema: z.object({
        recipient: z.string(), // Email address to send to
        subject: z.string() // Subject line of the email
    })
})

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


//10,000 -
// Build the agent with an OpenAI model, all three tools, and a middleware pipeline
const agent =createAgent({
    model : "gpt-4o", // Primary/main model used for reasoning and final responses
    tools : [searchTool,emailTool,getWeather], // Full set of tools available before selection middleware trims them
    middleware :[
        //50 tools -  basic model - 3-4 tools - Main model( reasoning) -> output
        // This middleware should run FIRST to select tools using gpt-4o-mini

        // If a call to gpt-4o-mini fails, automatically fall back to trying gpt-3.5-turbo next
        modelFallbackMiddleware("gpt-4o-mini","gpt-3.5-turbo"),
        // Once the conversation exceeds 8000 tokens, summarize older turns to shrink context,
        // but always keep the most recent 20 messages verbatim (not summarized)
        summarizationMiddleware({
            model : "gpt-4o",
            maxTokensBeforeSummary :8000, //Trigger summarization of 8000 tokens
            messagesToKeep :20
        }),
        // Use gpt-4o-mini to pick at most 2 of the available tools as relevant to this request,
        // reducing what the main gpt-4o model has to consider
        llmToolSelectorMiddleware({
            model : "gpt-4o-mini",
            maxTools : 2
        }),
    ]
})

// Invoke the agent with a request that should trigger both getWeather and emailTool
const response = await agent.invoke({
    messages: [{role : "user", content: "what is the weather in tokyo and email to rahulshetty@gmail.com with subject weather"}]
})
// Print the full agent response object
console.log(response)
