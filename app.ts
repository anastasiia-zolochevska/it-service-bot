import { Bot, MessageStyler, CardStyler, MemoryStorage, BotStateManager, RegExpRecognizer, RecognizeOrder, IntentRecognizer } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import { LuisRecognizer, QnAMaker, QnAMakerResult } from 'botbuilder-ai';

import *  as restify from 'restify';

import { IntentRecognizerSet } from './intentRecognizerSet';
import { processGreeting, processAgentCall, processHelp, processCancel } from './regexpProcessing';
import { processOpenOrdersRequest, processClosedOrdersRequest, callOrderService } from './mockApi';


// Create regexp recognizer
let regExpRecognizer = new RegExpRecognizer()
    .addIntent('HelpIntent', /^(help)$/i)
    .addIntent('GreetIntent', /^(hi|hello|greetings|good morning|good afternoon)$/i)
    .addIntent('AgentIntent', /^(agent|connect to agent)$/i);

// Create LUIS recognizer
const appId = '992b6593-cf27-4486-925d-8d6a732eb57c';
const subscriptionKey = '833384c5334b48aa8b6843518fc32a46';
let luisRecognizer: LuisRecognizer = new LuisRecognizer(appId, subscriptionKey);

// Create QnA model
const qna = new QnAMaker({
    knowledgeBaseId: '0bda7583-c683-4b95-a8a5-d79166ad48c3',
    subscriptionKey: '640b8d79871a4b2382e99f71d25ef945',
    top: 4,
    scoreThreshold: 0.5
} as any);

// Create recognizer set with all recognizers
const recognizerSet = new IntentRecognizerSet({
    recognizeOrder: RecognizeOrder.series,
    stopOnExactMatch: true
})
    .add(regExpRecognizer, 1.0)
    .add(luisRecognizer, 0.5);


// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter and listen to servers '/api/messages' route.
const adapter: BotFrameworkAdapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


server.post('/api/messages', (adapter as any).listen());

const bot = new Bot(adapter)
    .use(new MemoryStorage())
    .use(new BotStateManager())
    .onReceive((context: BotContext) => {
        if (context.request.type === 'conversationUpdate') {
            let botId = context.conversationReference.bot ? context.conversationReference.bot.id : -1;
            if (context.request.membersAdded && context.request.membersAdded.filter((obj) => { return obj.id == botId }).length == 0) {
                context.reply("Hello!");
                return;
            }
        }
        if (context.request.type === 'message') {
            if (context.state.conversation && context.state.conversation.prompt) {
                return orderComputerPromt(context);
            }

            const utterance = context.request.text || '';
            return recognizerSet.recognize(context)
                .then(intents => IntentRecognizer.findTopIntent(intents))
                .then(topIntent => {
                    console.log(`Intent: ${topIntent ? topIntent.name : 'no intent found'}`);

                    if (!topIntent || topIntent.name === 'None') {
                        // Call QnA Maker
                        return qna.getAnswers(utterance)
                            .then((results: QnAMakerResult[]) => {
                                console.log(results);
                                if (results.length > 0) {
                                    // QnA Maker found a good answer
                                    context.reply("QnA: " + results[0].answer);
                                } else {
                                    // QnA Maker didn't find a good answer
                                    const card = CardStyler.heroCard('We could not find an answer for you', [], ['Connect to Agent']);
                                    context.reply(MessageStyler.attachment(card));
                                }
                            });
                    }

                    switch (topIntent.name) {
                        case 'HelpIntent':
                            processHelp(context);
                            break;
                        case 'GreetIntent':
                            processGreeting(context);
                            break;
                        case 'AgentIntent':
                            processAgentCall(context);
                            break;
                        case 'openOrders':
                            context.reply(processOpenOrdersRequest());
                            break;
                        case 'closedOrders':
                            context.reply(processClosedOrdersRequest());
                            break;
                        case 'orderComputer':
                            orderComputerPromt(context);
                            break;
                        default:
                            // This should never happen if you handle all possible intents
                            context.reply(`Unhandled intent: ${topIntent.name}`)
                    }
                });
        }
    });


function orderComputerPromt(context: BotContext) {
    if (!context.state.conversation) {
        context.state.conversation = {};
    }
    if (!context.state.conversation.prompt) {
        context.state.conversation.prompt = 'platform';
        context.reply(`What is the platform?`);
    } else if (context.state.conversation.prompt === 'platform') {
        context.state.conversation['platform'] = context.request.text
        context.state.conversation.prompt = 'deviceClass';
        context.reply(`Got it. You want ${context.request.text}. What's the device class?`);
    } else if (context.state.conversation.prompt === 'deviceClass') {
        context.state.conversation['deviceClass'] = context.request.text
        context.reply(`Got it. You want ${context.request.text}. What's the OS version?`);
        context.state.conversation.prompt = 'osVersion';
    }
    else if (context.state.conversation.prompt === 'osVersion') {
        context.state.conversation['osVersion'] = context.request.text
        context.state.conversation.prompt = 'confirmOrder';
        context.reply(`Got it. Platform: ${context.state.conversation['platform']}. Device class: ${context.state.conversation['deviceClass']}.  OS Version: ${context.state.conversation['osVersion']}.`);
        context.reply(MessageStyler.attachment(
            CardStyler.heroCard(
                'Do you confirm ordering it?',
                [],
                ['Yes', 'No']
            )
        ));
    }
    else if (context.state.conversation.prompt === 'confirmOrder') {
        let confirmation = context.request.text;
        context.state.conversation['confirmOrder'] = confirmation;
        if (confirmation && confirmation.toLowerCase() == "yes") {
            context.reply(`Ok. Placing your order. It might take a while. I'll get back to you as soon as I get update about your order. Can I help with anything else meanwhile? `);

            let reference = context.conversationReference;

             callOrderService('2332', context.state.conversation['deviceClass'], context.state.conversation['osVersion'], context.state.conversation['platform']).then((ticketId: string) => {
                bot.createContext(reference, (proactiveContext) => {proactiveContext.reply(`Got response. Your ticket id is ${ticketId}`)});
    
            })
        }
        else {
            context.reply(`Ok. I see I didn't understand your request. Let's start from scratch`);
        }
        context.state.conversation.prompt = undefined;
    }
}