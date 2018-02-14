import { TopicsRoot } from 'promptly-bot';

import { RecognizeOrder, RegExpRecognizer, IntentRecognizer, CardStyler, MessageStyler } from 'botbuilder';
import { LuisRecognizer, QnAMaker, QnAMakerResult } from 'botbuilder-ai';
import { processGreeting, processAgentCall, processHelp, processCancel } from '../regexpProcessing';
import { processOpenOrdersRequest, processClosedOrdersRequest, callOrderService } from '../mockApi';
import { IntentRecognizerSet } from '../intentRecognizerSet';
import { OrderComputerTopic } from './orderComputerTopic';



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

export class RootTopic extends TopicsRoot {

    public constructor(context: BotContext) {
        super(context);

        this.subTopics
            .set("orderComputerTopic", () => new OrderComputerTopic()
                .onSuccess((context, value) => {
                    this.clearActiveTopic();

                    if (value) {
                        console.log(value);
                       
                        context.reply(`Ok. Placing your order. It might take a while. I'll get back to you as soon as I get update about your order. Can I help with anything else meanwhile? `);
                        let reference = context.conversationReference;

                        callOrderService('2332', value).then((ticketId: string) => {
                            context.bot.createContext(reference, (proactiveContext) => { proactiveContext.reply(`Got response. Your ticket id is ${ticketId}`) });
                        })
                    }

                })
                .onFailure((context, reason) => {
                    this.clearActiveTopic();

                    if (reason && reason === 'toomanyattempts') {
                        context.reply(`Let's try something else.`);
                    }
                    if (reason && reason === 'userCancelled') {
                        context.reply(`Ok. No problem. Let's try something else.`);
                    }
                })
            )

    }

    public onReceive(context: BotContext) {

        if (context.request.type === 'message') {

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
                                    this.clearActiveTopic();
                                } else {
                                    // QnA Maker didn't find a good answer
                                    if (this.hasActiveTopic) {
                                        return this.activeTopic.onReceive(context);
                                    }
                                    else {
                                        const card = CardStyler.heroCard('We could not find an answer for you', [], ['Connect to Agent']);
                                        context.reply(MessageStyler.attachment(card));
                                        this.clearActiveTopic();
                                    }
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
                            this.clearActiveTopic();
                            break;
                        case 'closedOrders':
                            context.reply(processClosedOrdersRequest());
                            this.clearActiveTopic();
                            break;
                        case 'orderComputer':
                            // orderComputerPromt(context);
                            return this.setActiveTopic("orderComputerTopic").onReceive(context);
                        default:
                            // This should never happen if you handle all possible intents
                            context.reply(`Unhandled intent: ${topIntent.name}`)
                    }

                });
        }

        if (this.hasActiveTopic) {
            return this.activeTopic.onReceive(context);
        }
    }
}