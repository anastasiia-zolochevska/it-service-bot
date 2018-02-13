export function processHelp(context: BotContext) {
    context.reply(` 
            List of commands can be run anytime        
            - Show my open orders
            - Show my closed orders
            - I forgot my password`);
}

export function processGreeting(context: BotContext) {
    context.reply(`regexp: Hello! How can I help you?`);
}


export function processAgentCall(context: BotContext) {
    context.reply(`Agent service is not available yet `);
}
