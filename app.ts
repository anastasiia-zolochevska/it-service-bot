import { Bot, MessageStyler, CardStyler, MemoryStorage, BotStateManager } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import *  as restify from 'restify';

import { LuisRecognizer, QnAMaker, QnAMakerResult } from 'botbuilder-ai';

import { RootTopic } from './topics/rootTopic';

import { processGreeting, processAgentCall, processHelp, processCancel } from './regexpProcessing';
import { processOpenOrdersRequest, processClosedOrdersRequest, callOrderService } from './mockApi';

const appId = '992b6593-cf27-4486-925d-8d6a732eb57c';
const subscriptionKey = '833384c5334b48aa8b6843518fc32a46';
let model: LuisRecognizer = new LuisRecognizer(appId, subscriptionKey);


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


const qna = new QnAMaker({
    knowledgeBaseId: '0bda7583-c683-4b95-a8a5-d79166ad48c3',
    subscriptionKey: '640b8d79871a4b2382e99f71d25ef945',
    top: 4,
    scoreThreshold: 0.5
} as any);


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

            if (processGreeting(context) || processAgentCall(context) || processHelp(context) || processCancel(context)) {
                return;
            }


            return model.recognize(context)
                .then((intents) => LuisRecognizer.findTopIntent(intents))

                .then((intent) => {
                    // console.log(intent);nn
                
                    let luisConfidenceLevel = 0.5;
                    if (intent && intent.score > luisConfidenceLevel && intent.name != "None") {
                        switch (intent.name) {
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
                                context.reply(`Luis. Can't process intent: ${intent.name}`)
                        }
                    }
                    else {
                        const utterance = context.request.text || '';
                        return qna.getAnswers(utterance)
                            .then((results: QnAMakerResult[]) => {
                                // console.log(results);
                                if (results && results.length > 0 && results[0].score > 0.9) {
                                    context.reply("QnA: " + results[0].answer);
                                } else {

                                   

                                    context.reply(MessageStyler.attachment(
                                        CardStyler.heroCard(
                                            'We could not find an answer for you',
                                            [],
                                            ['Connect to Agent']
                                        )
                                    ));
                                }
                            });
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


