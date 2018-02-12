import { Bot, MessageStyler, CardStyler } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder-services';
import *  as restify from 'restify';

import { LuisRecognizer, QnAMaker, QnAMakerResult } from 'botbuilder-ai';

import { processGreeting, processAgentCall, processHelp } from './regexpProcessing';
import { processOpenOrdersRequest, processClosedOrdersRequest } from './mockApi';

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
});


server.post('/api/messages', (adapter as any).listen());



const bot = new Bot(adapter)
    .onReceive((context: BotContext) => {
        console.log('context', context);
        if (context.request.type === 'message') {
            if(processGreeting(context) || processAgentCall(context) || processHelp(context)){
                return;
            }

            return model.recognize(context)
                .then((intents) => LuisRecognizer.findTopIntent(intents))

                .then((intent) => {
                    console.log(intent);
                    if (intent && intent.score > luisConfidenceLevel && intent.name != "None") {
                        switch (intent.name) {
                            case 'openOrders':
                                context.reply(processOpenOrdersRequest());
                                break;
                            case 'closedOrders':
                                context.reply(processClosedOrdersRequest());
                                break;
                            default:
                                context.reply(`Luis. Can't process intent: ${intent.name}`)
                        }
                    }
                    else {
                        const utterance = context.request.text || '';
                        return qna.getAnswers(utterance)
                            .then((results: QnAMakerResult[]) => {
                                console.log(results);
                                if (results && results.length > 0 && results[0].score > 0.5) {
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


