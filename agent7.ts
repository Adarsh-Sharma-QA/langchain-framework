// createAgent builds the agent; tool wraps a function as a callable tool.
// llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware are imported but
// unused in this file (only piiRedactionMiddleware is actually applied below).
//   - piiRedactionMiddleware: scans messages for personally identifiable information matching
//     configured regex rules and redacts/masks it (e.g. before it reaches the model or logs),
//     helping prevent sensitive data like card numbers or SSNs from leaking through the agent.
import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, piiRedactionMiddleware, summarizationMiddleware, tool } from "langchain";
// Zod defines each tool's input schema
import z from "zod";
// Load environment variables (e.g. API keys) from a .env file
import "dotenv/config"

//LLM ->50-70

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
// (missing `return` keyword), so this tool actually resolves to `undefined` at runtime.
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

//retriever tool.

//10,000 -
// Build the agent with an OpenAI model, all three tools, and PII redaction middleware
const agent =createAgent({
    model : "gpt-4o", // Primary model used for reasoning and responses
    tools : [searchTool,emailTool,getWeather], // Tools the agent can choose to call
    middleware :[
        // Redacts matched sensitive data patterns out of the conversation before/around model calls
        piiRedactionMiddleware ({

            rules :{
                // Matches 16-digit credit card numbers, optionally grouped by spaces or dashes
                credit_card :/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
                // Matches US Social Security Numbers in NNN-NN-NNNN format
                ssn : /\b\d{3}-\d{2}-\d{4}\b/g,
                // Matches US-style phone numbers with optional dash/dot separators
                phone : /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,



            }
        })



    ]
})

// const response = await agent.invoke({
//     messages: [{role : "user", content: "my card is 4532-1234-5678-9010"}]
// })
// console.log(response)

// const response = await agent.invoke({
//     messages: [{role : "user", content: "my ssn is 123-45-6789 and call me 555-123-4567 "}]
// })
// console.log(response)

// Active invocation: contains an SSN (should be redacted by the ssn rule above) plus an
// unrelated question about the user's email provider being "good"
const response = await agent.invoke({
    messages: [{role : "user", content: "my ssn is 123-45-6789 & My email is gmail provider. is this good?"}]
})
// Print the full agent response object — the SSN should not appear in plaintext if redaction worked
console.log(response)
